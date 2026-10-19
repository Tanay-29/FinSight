/**
 * The 30-day spending summary, moved here from the old Feed screen when the
 * home tab became Today. Pure, so the Money tab can memo it.
 *
 * The window is the last 30 days rather than the calendar month: on the 1st a
 * calendar month is empty, and someone who logged steadily for four weeks
 * would be told they spent nothing. The comparison is the 30 days before.
 * Days are local, not UTC: an evening entry in India belongs to that evening.
 */
import { toDayKey } from './noSpendDays';

interface Txn {
    type: string;
    amount: number;
    date: string;
}

export interface SpendSummary {
    totalSpent: number;
    /** Null when there is nothing in the previous window to compare against. */
    comparison: { type: 'increase' | 'decrease' | 'flat'; percentage: number } | null;
    /** Thirty local days of debits, oldest first, for the sparkline. */
    dailyTrend: { key: string; amount: number }[];
}

const DAY = 24 * 60 * 60 * 1000;

export function summariseSpending(transactions: Txn[], now: number = Date.now()): SpendSummary {
    const inWindow = (windowsAgo: number) => {
        const end = now - windowsAgo * 30 * DAY;
        const start = end - 30 * DAY;
        return transactions.reduce((acc, t) => {
            if (t.type !== 'debit') return acc;
            const at = new Date(t.date).getTime();
            return at >= start && at < end ? acc + t.amount : acc;
        }, 0);
    };

    const totalSpent = inWindow(0);
    const previous = inWindow(1);
    let comparison: SpendSummary['comparison'] = null;
    if (previous > 0) {
        const delta = ((totalSpent - previous) / previous) * 100;
        comparison = Math.abs(delta) < 1
            ? { type: 'flat', percentage: 0 }
            : { type: delta > 0 ? 'increase' : 'decrease', percentage: Math.abs(Math.round(delta)) };
    }

    const totals = new Map<string, number>();
    for (const t of transactions) {
        if (t.type !== 'debit') continue;
        const at = new Date(t.date);
        if (!Number.isFinite(at.getTime())) continue;
        const key = toDayKey(at);
        totals.set(key, (totals.get(key) ?? 0) + (t.amount || 0));
    }
    const dailyTrend = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (29 - i));
        const key = toDayKey(d);
        return { key, amount: totals.get(key) ?? 0 };
    });

    return { totalSpent, comparison, dailyTrend };
}
