/**
 * iqSlice.ts
 *
 * FinSight IQ - Behavioral Financial Score (0–1000) + AI Advisor state.
 *
 * Score Algorithm (base 400):
 *   +5  per transaction tracked (max +100 - up to 20 transactions)
 *   +10 per budget category that is under 80% used this month
 *   -20 per budget category that is over 100% (busted), net clamped to +/-100
 *   +50 for every 25% milestone hit on any goal, total capped at +200
 *   +20 per learning module completed (capped at +200)
 *   +5  per learning streak day (capped at +100)
 *
 * The score is clamped between 0 and 1000.
 *
 * Every term is bounded, and that is deliberate. The budget and goal terms
 * used to sum without limit, which made the score payable by declaring
 * intentions rather than by acting on them: opening ten generous budget
 * categories collected +100 for no restraint at all, and two completed goals
 * contributed +400, on their own enough to saturate the scale. Both rewarded
 * exactly the behaviour the score exists to discourage. With the caps below,
 * no single dimension can saturate it.
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { authedFetch } from '../../config/api';
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
    lastFetchedAt: string | null; // ISO string - throttle to once per session
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

    // Budget discipline: +10 for under 80%, -20 for over 100%.
    //
    // Clamped to +/-100 net. Without the clamp the term summed over however
    // many categories existed, so creating ten roomy budgets bought +100 while
    // restraining nothing.
    const monthBudgets = budgets.filter((b) => b.month === thisMonth);
    let budgetPoints = 0;
    monthBudgets.forEach((b) => {
        const pct = b.monthlyLimit > 0 ? b.currentSpend / b.monthlyLimit : 0;
        if (pct <= 0.8) budgetPoints += 10;
        else if (pct > 1.0) budgetPoints -= 20;
    });
    score += Math.max(-100, Math.min(100, budgetPoints));

    // Goal milestones: +50 per 25% milestone reached across ALL goals.
    //
    // Capped at +200 in total. Uncapped, two finished goals contributed +400,
    // which alone saturated the scale and made every other dimension moot.
    let goalPoints = 0;
    goals.forEach((g) => {
        const pct = g.targetAmount > 0 ? g.savedAmount / g.targetAmount : 0;
        if (pct >= 1.0) goalPoints += 200;       // 100% done: +50×4
        else if (pct >= 0.75) goalPoints += 150;  // 75%+: +50×3
        else if (pct >= 0.50) goalPoints += 100;  // 50%+: +50×2
        else if (pct >= 0.25) goalPoints += 50;   // 25%+: +50×1
    });
    score += Math.min(goalPoints, 200);

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
                    targetAmount: g.targetAmount,
                    savedAmount: g.savedAmount,
                })),
            };

            const res = await authedFetch('/api/ai-advisor', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            // friendlyError passes short custom messages straight through, so
            // a status code here would have reached the user unchanged. It did.
            if (!res.ok) {
                throw new Error(
                    res.status >= 500
                        ? 'Your coach is waking up. Give it a moment and pull to refresh.'
                        : 'Could not reach your coach just now.'
                );
            }
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
