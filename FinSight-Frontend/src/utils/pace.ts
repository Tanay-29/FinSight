/**
 * Where this month's spending is heading.
 *
 * The old projection took everything spent so far, divided by the days gone
 * and multiplied by the days in the month. Rent paid on the 1st then counted
 * thirty times: five days in, ₹8,000 of rent became ₹48,000 of "pace". Bills
 * like rent, utilities and fees happen once a month whatever the date, so
 * they are counted once here and only the day-to-day spending is carried
 * forward at its daily rate.
 */
import { normaliseCategory, Category } from './categories';

interface Txn { amount: number; type: string; category: string; date: string }

/** Paid once a month, not spread across it. */
export const ONCE_A_MONTH: Category[] = ['housing', 'utilities', 'education'];

export interface Pace {
    daysInMonth: number;
    /** Today, 1-based. */
    day: number;
    spent: number;
    /** Rent, bills and fees so far: counted once. */
    fixed: number;
    /** Everything else so far. */
    variable: number;
    /** Day-to-day spending per day so far. */
    perDay: number;
    projected: number;
    /** Running total at the end of each day so far, index 0 = day 1. */
    cumulative: number[];
    /** Spent this month per canonical category. */
    byCategory: Record<string, number>;
}

export function monthPace(transactions: Txn[], now: Date = new Date()): Pace {
    const y = now.getFullYear();
    const m = now.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const day = now.getDate();
    const daily = new Array(day).fill(0);
    const byCategory: Record<string, number> = {};
    let fixed = 0;
    let variable = 0;
    for (const t of transactions) {
        if (t.type !== 'debit') continue;
        const d = new Date(t.date);
        if (d.getFullYear() !== y || d.getMonth() !== m || d.getDate() > day) continue;
        const cat = normaliseCategory(t.category);
        daily[d.getDate() - 1] += t.amount;
        byCategory[cat] = (byCategory[cat] ?? 0) + t.amount;
        if (ONCE_A_MONTH.includes(cat)) fixed += t.amount;
        else variable += t.amount;
    }
    const cumulative: number[] = [];
    daily.reduce((run, v, i) => { cumulative[i] = run + v; return cumulative[i]; }, 0);
    const perDay = variable / day;
    const projected = fixed + perDay * daysInMonth;
    return { daysInMonth, day, spent: fixed + variable, fixed, variable, perDay, projected, cumulative, byCategory };
}
