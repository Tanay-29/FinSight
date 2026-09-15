/**
 * Last month, explained: a short deck built from the learner's own
 * transactions after a month closes.
 *
 * Five cards at most: the total against the month before, the category
 * that moved most, the single biggest purchase, what the recurring charges
 * added up to, and the savings rate if income is known. Each is an info
 * card followed where it makes sense by a question, so it reads as a lesson
 * about the learner's own money rather than a report.
 *
 * Pure. Every figure comes from the same helpers the Vitals tab uses.
 */
import type { Card } from '../data/lessons/schema';
import { normaliseCategory, categoryLabel, Category } from './categories';
import { resolveMonthlyIncome, savingsRate, savingsRateVerdict } from './income';
import { inr } from './moneyMath';
import { classifyRecurring, amountVariation } from './recurring';

export interface Txn { type: string; category: string; amount: number; date: string; merchant?: string }

interface MonthTotals { total: number; byCategory: Map<Category, number>; count: number; biggest?: Txn }

function monthKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function totalsFor(transactions: Txn[], key: string): MonthTotals {
    const byCategory = new Map<Category, number>();
    let total = 0;
    let count = 0;
    let biggest: Txn | undefined;
    for (const t of transactions) {
        if (t.type !== 'debit' || (t.date ?? '').slice(0, 7) !== key) continue;
        const c = normaliseCategory(t.category);
        byCategory.set(c, (byCategory.get(c) ?? 0) + (t.amount || 0));
        total += t.amount || 0;
        count += 1;
        // Rent is the biggest line every month and teaches nothing; skip it.
        if (c !== 'housing' && (!biggest || t.amount > biggest.amount)) biggest = t;
    }
    return { total, byCategory, count, biggest };
}

/**
 * Subscription-shaped spend in the month: merchants whose charges are steady
 * in amount and monthly in rhythm, by the same test the Subscriptions screen
 * uses. Ten food orders at the same price are not a subscription.
 */
function recurringTotal(transactions: Txn[], key: string): { total: number; merchants: string[] } {
    const byMerchant = new Map<string, { name: string; amounts: number[]; dates: number[] }>();
    for (const t of transactions) {
        // Rent is steady and monthly too, and is not a leak anyone can cancel.
        if (t.type !== 'debit' || !t.merchant || normaliseCategory(t.category) === 'housing') continue;
        const m = t.merchant.trim().toLowerCase();
        const at = new Date(t.date).getTime();
        if (!m || !Number.isFinite(at)) continue;
        const e = byMerchant.get(m) ?? { name: t.merchant.trim(), amounts: [], dates: [] };
        e.amounts.push(t.amount);
        e.dates.push(at);
        byMerchant.set(m, e);
    }
    let total = 0;
    const merchants: string[] = [];
    for (const e of byMerchant.values()) {
        if (e.amounts.length < 2) continue;
        const sorted = [...e.dates].sort((a, b) => a - b);
        const gaps = sorted.slice(1).map((d, i) => (d - sorted[i]) / 86_400_000);
        const avgGap = gaps.reduce((n, g) => n + g, 0) / gaps.length;
        const kind = classifyRecurring(amountVariation(e.amounts), avgGap);
        if (kind !== 'subscription') continue;
        const inMonth = transactions.filter((t) => t.type === 'debit' && t.merchant?.trim().toLowerCase() === e.name.toLowerCase() && (t.date ?? '').slice(0, 7) === key);
        if (inMonth.length === 0) continue;
        total += inMonth.reduce((n, t) => n + t.amount, 0);
        merchants.push(e.name);
    }
    return { total, merchants };
}

const monthName = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long' });
};

const rotate = <T,>(arr: T[], seed: number): T[] => {
    const s = seed % arr.length;
    return [...arr.slice(s), ...arr.slice(0, s)];
};

export interface Autopsy {
    monthKey: string;
    title: string;
    cards: Card[];
}

/**
 * The deck for the most recent closed month, or undefined when that month
 * has too little logged to say anything honest about.
 */
export function buildAutopsy(transactions: Txn[], incomeRange?: string, now: Date = new Date()): Autopsy | undefined {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const key = monthKey(lastMonth);
    const prevKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 2, 1));
    const cur = totalsFor(transactions, key);
    if (cur.count < 5) return undefined;
    const prev = totalsFor(transactions, prevKey);
    const name = monthName(key);
    const seed = lastMonth.getMonth();
    const cards: Card[] = [];

    // 1. The total, against the month before.
    const delta = prev.total > 0 ? ((cur.total - prev.total) / prev.total) * 100 : null;
    cards.push({
        id: 'ap_total', type: 'info',
        title: `${name}, in one number`,
        stat: { value: inr(cur.total), label: `spent across ${cur.count} entries` },
        body: delta === null
            ? 'No full month before this one to compare against yet. Next month this card gets a direction.'
            : Math.abs(delta) < 5
                ? `Within ${Math.abs(Math.round(delta))}% of ${monthName(prevKey)}. A flat month is a month you can plan from.`
                : delta > 0
                    ? `${Math.round(delta)}% more than ${monthName(prevKey)} (${inr(prev.total)}). The next card says where.`
                    : `${Math.abs(Math.round(delta))}% less than ${monthName(prevKey)} (${inr(prev.total)}). The next card says where it came from.`,
    });

    // 2. The category that moved most, as a question.
    const cats = [...cur.byCategory.entries()].sort((a, b) => b[1] - a[1]);
    if (cats.length >= 2) {
        let mover: Category = cats[0][0];
        let moverDelta = 0;
        if (prev.total > 0) {
            for (const [c, amt] of cats) {
                const d = amt - (prev.byCategory.get(c) ?? 0);
                if (Math.abs(d) > Math.abs(moverDelta)) { mover = c; moverDelta = d; }
            }
        }
        const pool = rotate(cats.slice(0, 4).map(([c]) => c), seed);
        if (pool.includes(mover)) {
            const amt = cur.byCategory.get(mover) ?? 0;
            cards.push({
                id: 'ap_mover', type: 'choice',
                prompt: prev.total > 0
                    ? `Which category changed most between ${monthName(prevKey)} and ${name}?`
                    : `Which category took the most of your ${name} spending?`,
                options: pool.map(categoryLabel),
                answer: pool.indexOf(mover),
                explain: prev.total > 0
                    ? `${categoryLabel(mover)}: ${inr(amt)}, ${moverDelta >= 0 ? 'up' : 'down'} ${inr(Math.abs(moverDelta))} from ${monthName(prevKey)}. One category usually explains most of a month's swing; this is the one to look at first.`
                    : `${categoryLabel(mover)} at ${inr(amt)}, ${Math.round((amt / cur.total) * 100)}% of the month.`,
            });
        }
    }

    // 3. The biggest single purchase.
    if (cur.biggest && cur.biggest.amount >= cur.total * 0.1) {
        const b = cur.biggest;
        cards.push({
            id: 'ap_biggest', type: 'info',
            title: 'The biggest single line',
            stat: { value: inr(b.amount), label: `${b.merchant || categoryLabel(normaliseCategory(b.category))}, ${Math.round((b.amount / cur.total) * 100)}% of the month` },
            body: b.amount >= cur.total * 0.3
                ? 'One purchase was almost a third of the month. Months like this are why an emergency fund and a purchase fund are two different things.'
                : 'Large one-offs are easy to remember and easy to plan for. It is the many small ones on the earlier card that slip.',
        });
    }

    // 4. Recurring charges.
    const rec = recurringTotal(transactions, key);
    if (rec.total > 0 && rec.merchants.length >= 1) {
        const share = Math.round((rec.total / cur.total) * 100);
        const opts = rotate([share, Math.max(1, share - 10), Math.min(90, share + 10), Math.min(90, share + 25)].filter((v, i, a) => a.indexOf(v) === i), seed);
        cards.push({
            id: 'ap_recurring', type: 'choice',
            prompt: `${rec.merchants.length} merchant${rec.merchants.length === 1 ? '' : 's'} charged you a steady amount in ${name}. What share of the month did those add up to?`,
            options: opts.map((p) => `About ${p}%`),
            answer: opts.indexOf(share),
            explain: `${inr(rec.total)}, ${share}%: ${rec.merchants.slice(0, 4).join(', ')}${rec.merchants.length > 4 ? ' and more' : ''}. Steady amounts from the same merchant are the subscription-shaped spend; the Subscriptions screen shows what cancelling any one is worth.`,
        });
    }

    // 5. Savings rate.
    const income = resolveMonthlyIncome(transactions, incomeRange, key);
    if (income.source !== 'unknown') {
        const rate = savingsRate(income.amount, cur.total);
        if (rate !== null) {
            const r = Math.round(rate);
            const v = savingsRateVerdict(r);
            cards.push({
                id: 'ap_rate', type: 'info',
                title: v.label,
                stat: { value: r < 0 ? `-${Math.abs(r)}%` : `${r}%`, label: `of ${income.source === 'logged' ? 'logged' : 'estimated'} income unspent in ${name}` },
                body: r >= 20
                    ? `${inr(income.amount)} in, ${inr(cur.total)} out. Above the 20% the 50/30/20 rule asks for. Money left in the account is saved whether or not it was moved; moving it is what stops it being spent next month.`
                    : r >= 0
                        ? `${inr(income.amount)} in, ${inr(cur.total)} out. Under 20%. The category card above is the lever; ${inr(Math.round(income.amount * 0.2 - (income.amount - cur.total)))} more unspent would reach it.`
                        : `${inr(cur.total)} out against ${inr(income.amount)} in. A month can run on a buffer; two in a row is a pattern.`,
            });
        }
    }

    if (cards.length < 2) return undefined;
    return { monthKey: key, title: `${name}, explained`, cards };
}
