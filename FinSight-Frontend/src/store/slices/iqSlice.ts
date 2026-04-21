/**
 * iqSlice.ts
 *
 * FinSight IQ — Behavioral Financial Score (0–1000) + AI Advisor state.
 *
 * Score Algorithm (base 400):
 *   +5  per transaction tracked (max +100 — up to 20 transactions)
 *   +10 per budget category that is under 80% used this month
 *   -20 per budget category that is over 100% (busted)
 *   +50 for every 25% milestone hit on any goal (25/50/75/100%)
 *   +20 per learning module completed (capped at +200)
 *   +5  per learning streak day (capped at +100)
 *
 * The score is clamped between 0 and 1000.
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { format, parseISO } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────

export interface IQQuest {
    title: string;
    description: string;
    points: number;
}

export interface AIAdvice {
    mood: string;
    explanation: string;
    quests: IQQuest[];
}

interface IQState {
    score: number;
    advice: AIAdvice | null;
    adviceLoading: boolean;
    adviceError: string | null;
    lastFetchedAt: string | null; // ISO string — throttle to once per session
}

const initialState: IQState = {
    score: 400,
    advice: null,
    adviceLoading: false,
    adviceError: null,
    lastFetchedAt: null,
};

// ─── Score Calculator ────────────────────────────────────────
// This runs on the frontend, reading from the Redux store.
// The result is then sent to the backend as context for Gemini.

export function calculateIQScore(
    transactions: any[],
    budgets: any[],
    goals: any[],
    completedModulesCount: number,
    streak: number,
): number {
    let score = 400;
    const thisMonth = format(new Date(), 'yyyy-MM');

    // +5 per debit transaction tracked this month (max +100)
    const monthlyTx = transactions.filter(
        (t) => t.type === 'debit' && t.date?.startsWith(thisMonth)
    );
    score += Math.min(monthlyTx.length * 5, 100);

    // Budget discipline: +10 for under 80%, -20 for over 100%
    const monthBudgets = budgets.filter((b) => b.month === thisMonth);
    monthBudgets.forEach((b) => {
        const pct = b.monthlyLimit > 0 ? b.currentSpend / b.monthlyLimit : 0;
        if (pct <= 0.8) score += 10;
        else if (pct > 1.0) score -= 20;
    });

    // Goal milestones: +50 per 25% milestone reached across ALL goals
    goals.forEach((g) => {
        const pct = g.targetAmount > 0 ? g.savedAmount / g.targetAmount : 0;
        if (pct >= 1.0) score += 200;       // 100% done: +50×4
        else if (pct >= 0.75) score += 150;  // 75%+: +50×3
        else if (pct >= 0.50) score += 100;  // 50%+: +50×2
        else if (pct >= 0.25) score += 50;   // 25%+: +50×1
    });

    // Learning: +20 per module completed (max +200)
    score += Math.min(completedModulesCount * 20, 200);

    // Streak: +5 per consecutive day (max +100)
    score += Math.min(streak * 5, 100);

    return Math.max(0, Math.min(1000, Math.round(score)));
}

// ─── Async Thunk: Fetch AI Advice ────────────────────────────

export const fetchAIAdvice = createAsyncThunk(
    'iq/fetchAdvice',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
            if (!backendUrl) throw new Error('Backend URL not configured.');

            const transactions = state.transactions.items;
            const budgets      = state.budgets.items;
            const goals        = (state as any).goals?.items ?? [];
            const streak       = (state.auth.profile as any)?.streak ?? 0;

            // Calculate the score fresh
            const completedModules = (state as any).learning?.userProgress
                ? Object.values((state as any).learning.userProgress).reduce(
                    (acc: number, p: any) => acc + (p.completedModules?.length ?? 0), 0
                  )
                : 0;
            const score = calculateIQScore(transactions, budgets, goals, completedModules, streak);

            const payload = {
                score,
                streak,
                transactions: transactions.slice(0, 15).map((t) => ({
                    date: t.date,
                    type: t.type,
                    amount: t.amount,
                    category: t.category,
                    merchant: t.merchant,
                })),
                budgets: budgets.map((b) => ({
                    category: b.category,
                    monthlyLimit: b.monthlyLimit,
                    currentSpend: b.currentSpend,
                })),
                goals: goals.slice(0, 3).map((g: any) => ({
                    title: g.title,
                    emoji: g.emoji,
                    targetAmount: g.targetAmount,
                    savedAmount: g.savedAmount,
                })),
            };

            const res = await fetch(`${backendUrl}/api/ai-advisor`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            const advice: AIAdvice = await res.json();
            return { advice, score };
        } catch (err: any) {
            return rejectWithValue(err.message);
        }
    }
);

// ─── Slice ───────────────────────────────────────────────────

const iqSlice = createSlice({
    name: 'iq',
    initialState,
    reducers: {
        setScore(state, action: PayloadAction<number>) {
            state.score = action.payload;
        },
        clearAdvice(state) {
            state.advice = null;
            state.lastFetchedAt = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAIAdvice.pending, (state) => {
                state.adviceLoading = true;
                state.adviceError = null;
            })
            .addCase(fetchAIAdvice.fulfilled, (state, action) => {
                state.adviceLoading = false;
                state.advice = action.payload.advice;
                state.score  = action.payload.score;
                state.lastFetchedAt = new Date().toISOString();
            })
            .addCase(fetchAIAdvice.rejected, (state, action) => {
                state.adviceLoading = false;
                state.adviceError = action.payload as string;
            });
    },
});

export const { setScore, clearAdvice } = iqSlice.actions;
export default iqSlice.reducer;
