/**
 * Essential monthly spend from the user's own transactions, for the runway
 * explorable. "Essential" is the needs bucket in utils/vitals.ts: rent,
 * groceries, utilities, transport, health. Averaged over the last 90 days so
 * one big month does not set the number.
 *
 * Returns the source so the screen can say whether the figure was measured
 * or assumed; a runway computed from a guess should not look measured.
 */
import { bucketOf } from './vitals';

export interface EssentialSpend {
    monthly: number;
    source: 'logged' | 'assumed';
    /** How many essential debits fed the figure. */
    count: number;
}

/** A fallback for accounts with no logged essentials yet. */
export const ASSUMED_ESSENTIALS = 25_000;

export function essentialMonthlySpend(
    transactions: { type: string; category: string; amount: number; date: string }[],
    windowDays = 90,
    now: Date = new Date(),
): EssentialSpend {
    const cutoff = now.getTime() - windowDays * 86_400_000;
    let total = 0;
    let count = 0;
    let earliest = now.getTime();
    for (const t of transactions) {
        if (t.type !== 'debit') continue;
        const at = new Date(t.date).getTime();
        if (!Number.isFinite(at) || at < cutoff) continue;
        if (bucketOf(t.category) !== 'needs') continue;
        total += t.amount || 0;
        count += 1;
        if (at < earliest) earliest = at;
    }
    if (count < 3 || total <= 0) return { monthly: ASSUMED_ESSENTIALS, source: 'assumed', count };
    // Scale by the span actually covered, so a two-week-old account is not
    // divided by three months.
    const spanDays = Math.max(14, (now.getTime() - earliest) / 86_400_000);
    const monthly = (total / spanDays) * 30.4;
    return { monthly: Math.round(monthly), source: 'logged', count };
}

export interface CibilInputs {
    /** Share of total limit in use on statement dates, 0 to 1. */
    utilisation: number;
    /** Share of the last 24 payments made on time, 0 to 1. */
    onTime: number;
    /** Age of the oldest account, in years. */
    ageYears: number;
    /** Hard enquiries in the last six months. */
    enquiries: number;
}

/**
 * An illustrative credit score. This is not the bureau's formula, which is
 * proprietary; it is the published weighting (payment history heaviest,
 * utilisation next, then age, then enquiries) mapped onto the 300 to 900
 * range so the learner can see which lever moves the needle most.
 */
export function illustrativeCibil(i: CibilInputs): number {
    const payment = Math.pow(Math.max(0, Math.min(1, i.onTime)), 3);
    const util = i.utilisation <= 0.3 ? 1 : i.utilisation <= 0.5 ? 0.75 : i.utilisation <= 0.75 ? 0.45 : i.utilisation < 1 ? 0.2 : 0.05;
    const age = Math.min(1, i.ageYears / 7);
    const enq = i.enquiries === 0 ? 1 : i.enquiries <= 2 ? 0.8 : i.enquiries <= 4 ? 0.5 : 0.2;
    const composite = 0.40 * payment + 0.30 * util + 0.18 * age + 0.12 * enq;
    return Math.round(300 + composite * 600);
}

/** What an amount of money in `years` buys in today's rupees at a given inflation rate. */
export function presentValue(amount: number, annualRate: number, years: number): number {
    return amount / Math.pow(1 + annualRate, years);
}
