/**
 * Cards written from the learner's own transactions.
 *
 * This is the thing no other learning app can do: the question is about
 * your last thirty days, and the answer is computed from them. Six
 * generators, one picked per day so the session does not repeat itself,
 * each returning undefined when the data is not there to support it.
 *
 * Every figure comes from the same pure functions the Vitals tab uses, so a
 * card can never disagree with the screen next to it.
 */
import type { ChoiceCard } from '../data/lessons/schema';
import { categoryTotals } from './spendQuiz';
import { resolveMonthlyIncome, savingsRate } from './income';
import { summariseNoSpendDays } from './noSpendDays';
import { futureValueOfSeries } from './projections';
import { inr, inrShort } from './moneyMath';

export interface Txn { type: string; category: string; amount: number; date: string }

type Generator = (t: Txn[], incomeRange: string | undefined, now: Date) => ChoiceCard | undefined;

/** Four options around the truth, shuffled deterministically by the seed. */
function bands(actual: number, labels: (n: number) => string, factors: number[], seed: number): { options: string[]; answer: number } {
    const values = factors.map((f) => Math.round(actual * f));
    const start = seed % values.length;
    const rotated = [...values.slice(start), ...values.slice(0, start)];
    return { options: rotated.map(labels), answer: rotated.indexOf(actual) };
}

const whichMore: Generator = (t) => {
    const totals = categoryTotals(t, 30);
    if (totals.length < 2) return undefined;
    const a = totals[0];
    const b = totals.find((x) => x !== a && x.amount >= a.amount * 0.35) ?? totals[1];
    const options = [a, b].sort((x, y) => (x.label < y.label ? -1 : 1));
    return {
        id: `ym_more_${a.key}_${b.key}`,
        type: 'choice',
        prompt: `In your last 30 days, which cost you more: ${options[0].label} or ${options[1].label}?`,
        options: options.map((o) => o.label),
        answer: options.indexOf(a),
        explain: `${a.label}: ${inr(a.amount)} across ${a.count} purchase${a.count === 1 ? '' : 's'}. ${b.label}: ${inr(b.amount)} across ${b.count}. Small frequent spends are the ones people underestimate; the count is the tell.`,
    };
};

const shareOfSpend: Generator = (t, _i, now) => {
    const totals = categoryTotals(t, 30);
    if (totals.length < 2) return undefined;
    const total = totals.reduce((n, c) => n + c.amount, 0);
    const top = totals[0];
    const pct = Math.round((top.amount / total) * 100);
    const choices = [pct, Math.max(5, pct - 15), Math.min(95, pct + 15), Math.max(5, pct - 30)];
    const unique = [...new Set(choices)];
    if (unique.length < 3) return undefined;
    const start = now.getDate() % unique.length;
    const rotated = [...unique.slice(start), ...unique.slice(0, start)];
    return {
        id: `ym_share_${top.key}`,
        type: 'choice',
        prompt: `${top.label} was your biggest category in the last 30 days. Roughly what share of everything you spent?`,
        options: rotated.map((p) => `About ${p}%`),
        answer: rotated.indexOf(pct),
        explain: `${inr(top.amount)} of ${inr(total)}, so ${pct}%. A single category above 40% is worth a budget of its own; below 25% and the money is spread thin enough that no one cut moves the total.`,
    };
};

const purchaseCount: Generator = (t, _i, now) => {
    const totals = categoryTotals(t, 30);
    const top = totals.find((c) => c.count >= 4);
    if (!top) return undefined;
    const { options, answer } = bands(top.count, (n) => `${n}`, [1, 0.5, 1.5, 2], now.getDate());
    return {
        id: `ym_count_${top.key}`,
        type: 'choice',
        prompt: `How many separate ${top.label.toLowerCase()} purchases did you make in the last 30 days?`,
        options,
        answer,
        explain: `${top.count}, averaging ${inr(top.amount / top.count)} each. People remember the big ones and forget the count. The count is what makes ${inr(top.amount)} out of purchases that each felt small.`,
    };
};

const investedInstead: Generator = (t, _i, now) => {
    const totals = categoryTotals(t, 30);
    const top = totals.find((c) => c.key === 'dining' || c.key === 'entertainment' || c.key === 'shopping') ?? totals[0];
    if (!top || top.amount < 500) return undefined;
    const monthly = Math.round(top.amount / 100) * 100;
    const fv = Math.round(futureValueOfSeries(monthly, 'monthly', 12, 10) / 1000) * 1000;
    const { options, answer } = bands(fv, (n) => inrShort(n), [1, 0.4, 0.65, 1.6], now.getDate());
    return {
        id: `ym_fv_${top.key}`,
        type: 'choice',
        prompt: `Your ${top.label.toLowerCase()} spend runs about ${inr(monthly)} a month. Invested at 12% instead, what is that worth in 10 years?`,
        options,
        answer,
        explain: `About ${inr(fv)}, from ${inr(monthly * 120)} actually put in. Nominal, before inflation and tax, and not a reason to stop eating out; it is the size of the lever, so you know what halving it would buy.`,
    };
};

const savingsRateCard: Generator = (t, incomeRange, now) => {
    const monthKey = now.toISOString().slice(0, 7);
    const income = resolveMonthlyIncome(t, incomeRange, monthKey);
    if (income.source === 'unknown') return undefined;
    const totals = categoryTotals(t, 30);
    const spend = totals.reduce((n, c) => n + c.amount, 0);
    if (spend <= 0) return undefined;
    const rate = savingsRate(income.amount, spend);
    if (rate === null) return undefined;
    const r = Math.round(rate);
    const choices = [...new Set([r, r - 20, r + 20, r - 40])].filter((x) => x >= -100 && x <= 100);
    if (choices.length < 3) return undefined;
    const start = now.getDate() % choices.length;
    const rotated = [...choices.slice(start), ...choices.slice(0, start)];
    return {
        id: 'ym_savingsrate',
        type: 'choice',
        prompt: `Against your ${income.source === 'logged' ? 'logged' : 'estimated'} monthly income of ${inr(income.amount)}, what share of it did the last 30 days of spending leave unspent?`,
        options: rotated.map((p) => (p < 0 ? `Overspent by ${-p}%` : `About ${p}%`)),
        answer: rotated.indexOf(r),
        explain: r < 0
            ? `You spent ${inr(spend)} against ${inr(income.amount)} in. That is more out than in, which a month can survive and a year cannot.`
            : `${inr(income.amount)} in, ${inr(spend)} out, ${r}% left. Twenty percent is the 50/30/20 target; anything unspent is saved whether or not it moved anywhere.`,
    };
};

const noSpend: Generator = (t, _i, now) => {
    const monthKey = now.toISOString().slice(0, 7);
    // An empty month is all no-spend days, which is not an insight.
    const debitsThisMonth = t.filter((x) => x.type === 'debit' && (x.date ?? '').slice(0, 7) === monthKey).length;
    if (debitsThisMonth < 5) return undefined;
    const s = summariseNoSpendDays(t.filter((x): x is Txn & { type: 'debit' | 'credit' } => x.type === 'debit' || x.type === 'credit'), now);
    if (s.daysElapsed < 7) return undefined;
    const actual = s.thisMonth;
    const choices = [...new Set([actual, actual + 3, Math.max(0, actual - 3), actual + 6])];
    const start = now.getDate() % choices.length;
    const rotated = [...choices.slice(start), ...choices.slice(0, start)];
    return {
        id: 'ym_nospend',
        type: 'choice',
        prompt: `${s.daysElapsed} days into the month, how many of them had no spending at all?`,
        options: rotated.map((n) => `${n} day${n === 1 ? '' : 's'}`),
        answer: rotated.indexOf(actual),
        explain: `${actual} of ${s.daysElapsed}${s.bestRunThisMonth > 1 ? `, with a best run of ${s.bestRunThisMonth} in a row` : ''}. No-spend days are not a target; they are a sign of how many days money leaves on autopilot.`,
    };
};

const GENERATORS: Generator[] = [whichMore, shareOfSpend, purchaseCount, investedInstead, savingsRateCard, noSpend];

/**
 * One card for today. Rotates through the generators by day of year, and
 * falls through to the next one when today's has no data behind it.
 */
export function buildYourMoneyCard(transactions: Txn[], incomeRange?: string, now: Date = new Date()): ChoiceCard | undefined {
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000);
    for (let k = 0; k < GENERATORS.length; k++) {
        const gen = GENERATORS[(dayOfYear + k) % GENERATORS.length];
        const card = gen(transactions, incomeRange, now);
        if (card && card.answer >= 0) return card;
    }
    return undefined;
}
