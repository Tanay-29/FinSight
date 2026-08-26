/**
 * FinSight Wrapped
 *
 * Turns a period of transactions into a handful of facts worth reading. The
 * value is not the totals, which the Vitals tab already shows: it is the
 * specifics people cannot compute for themselves, like which merchant they
 * visited most or what their single biggest lapse was.
 *
 * Everything here is derived from data already on the device. No network, no
 * server, nothing sent anywhere.
 */

export interface WrappedTransaction {
    amount: number;
    type: 'debit' | 'credit';
    category: string;
    merchant: string;
    date: string;
}

export interface CategoryTotal {
    category: string;
    total: number;
    count: number;
    /** Share of total spending, 0 to 100. */
    share: number;
}

export interface MerchantTotal {
    merchant: string;
    total: number;
    visits: number;
}

export interface WrappedStats {
    /** 'YYYY-MM' for a month, 'YYYY' for a year. */
    period: string;
    label: string;
    hasData: boolean;

    totalSpent: number;
    totalEarned: number;
    net: number;
    transactionCount: number;

    /** Average per day across days that actually had spending. */
    averageSpend: number;
    /** Number of days with no debit at all. */
    noSpendDays: number;

    topCategories: CategoryTotal[];
    topMerchants: MerchantTotal[];

    biggestSpend: WrappedTransaction | null;
    busiestDay: { date: string; total: number } | null;

    /** Percentage change in spend against the previous period, or null. */
    changeVsPrevious: number | null;

    /** Share of income kept, 0 to 100. Null when nothing was earned. */
    savingsRate: number | null;
}

/** '2026-08' for a month key, '2026' for a year key. */
function inPeriod(date: string, period: string): boolean {
    return (date || '').startsWith(period);
}

/** The period immediately before this one. */
export function previousPeriod(period: string): string {
    if (period.length === 4) return String(Number(period) - 1);
    const [y, m] = period.split('-').map(Number);
    return m === 1
        ? `${y - 1}-12`
        : `${y}-${String(m - 1).padStart(2, '0')}`;
}

/** Days in the period, used for the no-spend-day count. */
function daysInPeriod(period: string): number {
    if (period.length === 4) {
        const y = Number(period);
        return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
    }
    const [y, m] = period.split('-').map(Number);
    return new Date(y, m, 0).getDate();
}

export function computeWrapped(
    transactions: WrappedTransaction[],
    period: string,
    label: string
): WrappedStats {
    const inWindow = transactions.filter((t) => inPeriod(t.date, period));
    const debits = inWindow.filter((t) => t.type === 'debit');
    const credits = inWindow.filter((t) => t.type === 'credit');

    const totalSpent = debits.reduce((s, t) => s + (t.amount || 0), 0);
    const totalEarned = credits.reduce((s, t) => s + (t.amount || 0), 0);

    // Category totals, largest first.
    const byCategory = new Map<string, { total: number; count: number }>();
    for (const t of debits) {
        const key = (t.category || 'miscellaneous').toLowerCase();
        const entry = byCategory.get(key) ?? { total: 0, count: 0 };
        entry.total += t.amount || 0;
        entry.count += 1;
        byCategory.set(key, entry);
    }
    const topCategories: CategoryTotal[] = [...byCategory.entries()]
        .map(([category, v]) => ({
            category,
            total: v.total,
            count: v.count,
            share: totalSpent > 0 ? Math.round((v.total / totalSpent) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    // Merchant totals, ranked by visits then spend: "where you kept going back".
    const byMerchant = new Map<string, { total: number; visits: number }>();
    for (const t of debits) {
        const key = (t.merchant || 'Unknown').trim();
        if (!key || key.toLowerCase() === 'unknown merchant') continue;
        const entry = byMerchant.get(key) ?? { total: 0, visits: 0 };
        entry.total += t.amount || 0;
        entry.visits += 1;
        byMerchant.set(key, entry);
    }
    const topMerchants: MerchantTotal[] = [...byMerchant.entries()]
        .map(([merchant, v]) => ({ merchant, total: v.total, visits: v.visits }))
        .sort((a, b) => b.visits - a.visits || b.total - a.total)
        .slice(0, 5);

    // Daily totals, for the busiest day and the quiet ones.
    const byDay = new Map<string, number>();
    for (const t of debits) {
        const day = (t.date || '').slice(0, 10);
        if (!day) continue;
        byDay.set(day, (byDay.get(day) ?? 0) + (t.amount || 0));
    }
    let busiestDay: WrappedStats['busiestDay'] = null;
    for (const [date, total] of byDay) {
        if (!busiestDay || total > busiestDay.total) busiestDay = { date, total };
    }

    const biggestSpend = debits.reduce<WrappedTransaction | null>(
        (max, t) => (!max || (t.amount || 0) > (max.amount || 0) ? t : max),
        null
    );

    // Previous period comparison.
    const prev = previousPeriod(period);
    const prevSpent = transactions
        .filter((t) => t.type === 'debit' && inPeriod(t.date, prev))
        .reduce((s, t) => s + (t.amount || 0), 0);
    const changeVsPrevious = prevSpent > 0
        ? Math.round(((totalSpent - prevSpent) / prevSpent) * 100)
        : null;

    const spendingDays = byDay.size;

    return {
        period,
        label,
        hasData: inWindow.length > 0,
        totalSpent,
        totalEarned,
        net: totalEarned - totalSpent,
        transactionCount: inWindow.length,
        averageSpend: spendingDays > 0 ? Math.round(totalSpent / spendingDays) : 0,
        noSpendDays: Math.max(0, daysInPeriod(period) - spendingDays),
        topCategories,
        topMerchants,
        biggestSpend,
        busiestDay,
        changeVsPrevious,
        savingsRate: totalEarned > 0
            ? Math.round(((totalEarned - totalSpent) / totalEarned) * 100)
            : null,
    };
}
