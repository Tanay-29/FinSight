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
