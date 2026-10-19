/**
 * Recurring charge classification.
 *
 * Kept out of the screen so the decision can be checked directly. Whether a
 * merchant is reported as a commitment drives the leak figure, and the leak
 * figure drives the projection next to it, so this is worth being able to test.
 *
 * The rule that matters: interval alone cannot tell a subscription from a
 * habit. Three Amazon orders roughly thirty days apart look exactly like a
 * monthly plan until you notice they were Rs 1,450, Rs 890 and Rs 2,300. A real
 * subscription bills the same figure every cycle.
 */

export type RecurringType = 'subscription' | 'recurring' | 'weekly';

/**
 * How much the charged amount may wobble and still count as a subscription,
 * as a coefficient of variation. A price rise from Rs 199 to Rs 249 across
 * three cycles sits near 0.11 and survives, which is intended.
 */
export const SUBSCRIPTION_MAX_VARIATION = 0.15;

/**
 * Above this the amounts have nothing in common, so the merchant is one the
 * user visits often rather than one they are committed to.
 */
export const RECURRING_MAX_VARIATION = 0.60;

/** Shortest average gap treated as recurring. Below this it reads as manual entry. */
export const MIN_INTERVAL_DAYS = 3;

/** Longest average gap treated as recurring. */
export const MAX_INTERVAL_DAYS = 50;

/** Boundary between a weekly rhythm and a monthly one. */
export const WEEKLY_MAX_INTERVAL_DAYS = 10;

/**
 * Coefficient of variation: standard deviation over mean.
 *
 * Zero when every amount is identical. Population rather than sample, because
 * this describes the transactions in hand rather than inferring a wider one.
 */
export function amountVariation(amounts: number[]): number {
    if (amounts.length === 0) return 0;
    const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    if (mean === 0) return 0;
    const variance =
        amounts.reduce((sum, a) => sum + (a - mean) ** 2, 0) / amounts.length;
    return Math.sqrt(variance) / mean;
}

/**
 * Decide what a group of charges is, or null to not report it at all.
 *
 * Steadiness of amount is checked before rhythm, because it is the stronger
 * signal. Something billed every 30 days for a different amount each time is a
 * bill that varies, not a subscription, and saying so is the difference between
 * a useful leak figure and an inflated one.
 */
export function classifyRecurring(
    variation: number,
    avgIntervalDays: number
): RecurringType | null {
    if (avgIntervalDays < MIN_INTERVAL_DAYS) return null;
    if (avgIntervalDays > MAX_INTERVAL_DAYS) return null;
    if (variation > RECURRING_MAX_VARIATION) return null;

    if (variation > SUBSCRIPTION_MAX_VARIATION) return 'recurring';
    if (avgIntervalDays <= WEEKLY_MAX_INTERVAL_DAYS) return 'weekly';
    return 'subscription';
}

// ─── Detection ────────────────────────────────────────────────────

export interface RecurringCharge {
    merchant: string;
    normalised: string;
    category: string;
    totalCount: number;
    avgAmount: number;
    estimatedMonthly: number;
    avgIntervalDays: number;
    /** Coefficient of variation of the charged amounts. */
    variation: number;
    type: RecurringType;
    lastDate: string;
    transactions: { date: string; amount: number }[];
    /** Set when the latest charge of a subscription is higher than the one before. */
    priceRise: { from: number; to: number } | null;
}

interface Txn {
    type: string;
    amount: number;
    date: string;
    merchant?: string;
    category?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A subscription whose newest charge is up on the one before, by at least two
 * percent and five rupees, so rounding and a paisa of tax never trigger it.
 * Streaming services and phone plans raise prices quietly, and the only place
 * that shows is the next charge, which nobody reads.
 */
export function priceRise(amounts: number[]): { from: number; to: number } | null {
    if (amounts.length < 2) return null;
    const to = amounts[amounts.length - 1];
    const from = amounts[amounts.length - 2];
    return to - from >= 5 && to >= from * 1.02 ? { from, to } : null;
}

/**
 * Recurring charges in the last 90 days, most expensive per month first.
 * Moved here from the subscription screen so the Money tab can count them too.
 */
export function detectRecurring(
    transactions: Txn[],
    keyOf: (text: string) => string,
    now: Date = new Date(),
): RecurringCharge[] {
    const cutoff = now.getTime() - 90 * DAY_MS;
    const groups: Record<string, { date: string; amount: number; category: string; merchant: string }[]> = {};

    for (const t of transactions) {
        if (t.type !== 'debit') continue;
        const at = new Date(t.date).getTime();
        if (!Number.isFinite(at) || at < cutoff) continue;
        if (!t.merchant && !t.category) continue;
        const key = keyOf(t.merchant ?? t.category ?? 'unknown');
        (groups[key] ??= []).push({
            date: t.date,
            amount: t.amount,
            category: t.category ?? 'other',
            merchant: t.merchant ?? t.category ?? 'Unknown',
        });
    }

    const results: RecurringCharge[] = [];
    for (const [norm, txs] of Object.entries(groups)) {
        if (txs.length < 2) continue;
        const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
        let totalInterval = 0;
        for (let i = 1; i < sorted.length; i++) {
            totalInterval += Math.round((new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / DAY_MS);
        }
        const avgIntervalDays = Math.round(totalInterval / (sorted.length - 1));
        const avgAmount = txs.reduce((s, t) => s + t.amount, 0) / txs.length;
        const variation = amountVariation(txs.map((t) => t.amount));
        const type = classifyRecurring(variation, avgIntervalDays);
        if (type === null) continue;
        const last = sorted[sorted.length - 1];
        results.push({
            merchant: last.merchant,
            normalised: norm,
            category: last.category,
            totalCount: txs.length,
            avgAmount: Math.round(avgAmount),
            estimatedMonthly: Math.round((avgAmount * 30) / avgIntervalDays),
            avgIntervalDays,
            variation,
            type,
            lastDate: last.date,
            transactions: sorted.map((t) => ({ date: t.date, amount: t.amount })),
            priceRise: type === 'subscription' ? priceRise(sorted.map((t) => t.amount)) : null,
        });
    }
    return results.sort((a, b) => b.estimatedMonthly - a.estimatedMonthly);
}
