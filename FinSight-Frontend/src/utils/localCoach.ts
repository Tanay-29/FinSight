/**
 * The coach, computed on the phone.
 *
 * The IQ card used to show nothing but a skeleton until the server answered,
 * and when the server's Gemini call failed it returned a placeholder
 * ("we could not analyze your data") with HTTP 200, which the card rendered
 * as if it were the coach's read. On a phone with a real score of 505 the
 * user saw a generic line about tracking transactions.
 *
 * This file builds the same three things the model builds, mood,
 * explanation, quests, from the same inputs the score is built from, with
 * no model. It is what the card shows the instant it mounts and what it
 * keeps showing if the server is asleep or wrong. The model's version, when
 * it arrives, replaces it; the model still writes better prose. But the
 * floor is now correct, specific and immediate.
 *
 * Every figure here is the one the score formula in iqSlice.ts already used,
 * so the explanation cannot disagree with the gauge above it.
 */
import { format } from 'date-fns';
import { categoryLabel } from './categories';
import { inr } from './moneyMath';
import type { AIAdvice, IQQuest } from '../store/slices/iqSlice';

interface Txn { type: string; date: string; amount: number; category: string }
interface Budget { category: string; monthlyLimit: number; currentSpend: number; month: string }
interface Goal { title: string; targetAmount: number; savedAmount: number }

export interface CoachInputs {
    score: number;
    transactions: Txn[];
    budgets: Budget[];
    goals: Goal[];
    completedModules: number;
    streak: number;
}

/** The pieces of the score, mirrored from calculateIQScore so they can be named. */
function breakdown(i: CoachInputs) {
    const thisMonth = format(new Date(), 'yyyy-MM');
    const monthlyTx = i.transactions.filter((t) => t.type === 'debit' && t.date?.startsWith(thisMonth));
    const monthBudgets = i.budgets.filter((b) => b.month === thisMonth);
    const over = monthBudgets.filter((b) => b.monthlyLimit > 0 && b.currentSpend / b.monthlyLimit > 1);
    const under = monthBudgets.filter((b) => b.monthlyLimit > 0 && b.currentSpend / b.monthlyLimit <= 0.8);
    const near = monthBudgets.filter((b) => {
        const p = b.monthlyLimit > 0 ? b.currentSpend / b.monthlyLimit : 0;
        return p > 0.8 && p <= 1;
    });
    const goalPct = (g: Goal) => (g.targetAmount > 0 ? g.savedAmount / g.targetAmount : 0);
    const bestGoal = [...i.goals].sort((a, b) => goalPct(b) - goalPct(a))[0];
    const weakestGoal = [...i.goals].filter((g) => goalPct(g) < 1).sort((a, b) => goalPct(a) - goalPct(b))[0];
    return {
        txCount: monthlyTx.length,
        txPoints: Math.min(monthlyTx.length * 5, 100),
        over, under, near,
        budgetPoints: Math.max(-100, Math.min(100, under.length * 10 - over.length * 20)),
        learningPoints: Math.min(i.completedModules * 20, 200),
        streakPoints: Math.min(i.streak * 5, 100),
        bestGoal, weakestGoal, goalPct,
    };
}

function mood(i: CoachInputs, b: ReturnType<typeof breakdown>): string {
    if (b.txCount === 0) return 'Nothing logged this month yet, so the score is running on last month.';
    if (b.over.length >= 2) return `${b.over.length} categories are past their limit. That is where the score is leaking.`;
    if (b.over.length === 1) return `${categoryLabel(b.over[0].category)} is past its limit; everything else is holding.`;
    if (b.near.length >= 1) return `${categoryLabel(b.near[0].category)} is close to its limit. Worth watching this week.`;
    if (i.budgets.length === 0) return 'Spending is logged but nothing is measuring it. A budget would change the score fast.';
    if (i.score >= 750) return 'Disciplined month: budgets holding, goals moving, streak alive.';
    if (i.score >= 600) return 'Steady. The habits are there; the goals are where the next points are.';
    if (i.streak === 0) return 'The money side is fine. The streak is the cheapest thing to fix today.';
    return 'Building. Every logged rupee and every kept budget moves this.';
}

function explanation(i: CoachInputs, b: ReturnType<typeof breakdown>): string {
    const parts: string[] = [];
    parts.push(`${b.txCount} transaction${b.txCount === 1 ? '' : 's'} logged this month (+${b.txPoints})`);
    if (i.budgets.length === 0) parts.push('no budgets set (0)');
    else parts.push(`${b.under.length} budget${b.under.length === 1 ? '' : 's'} under 80% and ${b.over.length} over the limit (${b.budgetPoints >= 0 ? '+' : ''}${b.budgetPoints})`);
    parts.push(`${i.completedModules} lesson${i.completedModules === 1 ? '' : 's'} done (+${b.learningPoints})`);
    parts.push(`a ${i.streak}-day streak (+${b.streakPoints})`);
    const goalNote = b.bestGoal
        ? ` ${b.bestGoal.title} is ${Math.round(b.goalPct(b.bestGoal) * 100)}% funded.`
        : ' No savings goal yet, which is up to 200 points sitting unused.';
    return `Your score is ${i.score}: a base of 400, ${parts.join(', ')}.${goalNote}`;
}

function quests(i: CoachInputs, b: ReturnType<typeof breakdown>): IQQuest[] {
    const out: IQQuest[] = [];
    if (b.over.length > 0) {
        const c = b.over[0];
        out.push({ title: `Rein in ${categoryLabel(c.category)}`, description: `It is ${inr(c.currentSpend - c.monthlyLimit)} over its ${inr(c.monthlyLimit)} limit. No more spending there until the month rolls over turns a -20 into nothing.`, points: 20 });
    }
    if (b.near.length > 0 && out.length < 3) {
        const c = b.near[0];
        out.push({ title: `Hold ${categoryLabel(c.category)} under its limit`, description: `${inr(c.monthlyLimit - c.currentSpend)} of headroom left this month. Keeping it under keeps the +10.`, points: 10 });
    }
    if (i.budgets.length === 0 && out.length < 3) {
        out.push({ title: 'Set one budget', description: 'Pick your biggest category and give it a limit. Staying under 80% of it is +10 every month.', points: 10 });
    }
    if (b.txCount < 10 && out.length < 3) {
        out.push({ title: 'Log today\'s spending', description: `${b.txCount} logged so far this month; each one is +5, up to twenty. Paste the UPI message and the app fills the rest.`, points: 5 });
    }
    if (i.goals.length === 0 && out.length < 3) {
        out.push({ title: 'Create a savings goal', description: 'Even a small one. Every quarter of it you fund is +50, up to 200.', points: 50 });
    } else if (b.weakestGoal && out.length < 3) {
        const g = b.weakestGoal;
        const nextMilestone = Math.min(1, Math.floor(b.goalPct(g) * 4 + 1) / 4);
        const needed = Math.max(0, Math.round(g.targetAmount * nextMilestone - g.savedAmount));
        out.push({ title: `Move ${g.title} to ${Math.round(nextMilestone * 100)}%`, description: `${inr(needed)} more reaches the next milestone and is worth +50.`, points: 50 });
    }
    if (i.streak === 0 && out.length < 3) {
        out.push({ title: 'Do today\'s session', description: 'Three minutes in Learn starts the streak again. Each day is +5, up to 100.', points: 5 });
    }
    if (i.completedModules < 10 && out.length < 3) {
        out.push({ title: 'Finish one lesson', description: 'Any lesson in Learn is +20, up to 200. The daily session picks the next one for you.', points: 20 });
    }
    if (out.length < 3) {
        out.push({ title: 'Keep the streak', description: 'Everything else is holding. Showing up tomorrow is the whole job.', points: 5 });
    }
    return out.slice(0, 3);
}

export function buildLocalAdvice(i: CoachInputs): AIAdvice {
    const b = breakdown(i);
    return { mood: mood(i, b), explanation: explanation(i, b), quests: quests(i, b) };
}

/**
 * The server returns its placeholder with HTTP 200 when Gemini fails. That
 * placeholder is not coaching and must not be shown as if it were.
 */
export function isServerPlaceholder(advice: (AIAdvice & { fallback?: boolean }) | null | undefined): boolean {
    if (!advice) return false;
    if (advice.fallback) return true;
    return /could not analy[sz]e/i.test(advice.explanation ?? '') || /work in progress/i.test(advice.mood ?? '');
}
