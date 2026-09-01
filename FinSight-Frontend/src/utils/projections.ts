/**
 * Projections
 *
 * The maths behind the Time Machine and the leak projection: what a recurring
 * spend would be worth if it were invested instead. Kept pure and separate
 * from the UI so the numbers can be checked.
 *
 * Every figure produced here is nominal, before inflation and tax. That is a
 * real limitation and the screen says so rather than hiding it.
 */

export type Frequency = 'daily' | 'weekly' | 'monthly';

export const FREQUENCY_LABELS: Record<Frequency, string> = {
    daily: 'a day',
    weekly: 'a week',
    monthly: 'a month',
};

/** Contributions per year for each frequency. */
export const PERIODS_PER_YEAR: Record<Frequency, number> = {
    daily: 365,
    weekly: 52,
    monthly: 12,
};

/** Normalise any frequency to a monthly figure, for comparison. */
export function toMonthly(amount: number, frequency: Frequency): number {
    return (amount * PERIODS_PER_YEAR[frequency]) / 12;
}

/**
 * Future value of a regular contribution, compounded at the period rate.
 *
 * FV = P * (((1 + r)^n - 1) / r) * (1 + r)
 *
 * where r is the rate per period and n is the number of periods.
 *
 * The trailing (1 + r) makes this an annuity due: the contribution lands at
 * the start of each period and earns for the whole of it. That is how a SIP
 * works, it is the formula AMFI and the fund houses publish, and it is also
 * right for the question this file exists to answer. Money you did not spend
 * becomes available at the moment you would have spent it, not a month later.
 *
 * This was an ordinary annuity until now, which assumes the money arrives at
 * the end of each period and understates the result by exactly that factor.
 * CuratedBasketScreen carried its own annuity due copy, so the two disagreed
 * by about 0.8% a year. There is one implementation again.
 *
 * The zero-rate case is handled separately because the formula divides by r.
 */
export function futureValueOfSeries(
    amountPerPeriod: number,
    frequency: Frequency,
    annualRatePercent: number,
    years: number
): number {
    if (amountPerPeriod <= 0 || years <= 0) return 0;

    const periods = PERIODS_PER_YEAR[frequency] * years;
    const ratePerPeriod = annualRatePercent / 100 / PERIODS_PER_YEAR[frequency];

    if (ratePerPeriod === 0) return amountPerPeriod * periods;

    return (
        amountPerPeriod *
        ((Math.pow(1 + ratePerPeriod, periods) - 1) / ratePerPeriod) *
        (1 + ratePerPeriod)
    );
}

/** What the learner actually puts in, with no growth. */
export function totalContributed(
    amountPerPeriod: number,
    frequency: Frequency,
    years: number
): number {
    if (amountPerPeriod <= 0 || years <= 0) return 0;
    return amountPerPeriod * PERIODS_PER_YEAR[frequency] * years;
}

export interface ProjectionPoint {
    year: number;
    contributed: number;
    value: number;
    /** value - contributed. The part that compounding did. */
    growth: number;
}

/**
 * Year-by-year projection, for charting.
 * Index 0 is "today", so the series has `years + 1` points.
 */
export function projectionSeries(
    amountPerPeriod: number,
    frequency: Frequency,
    annualRatePercent: number,
    years: number
): ProjectionPoint[] {
    const points: ProjectionPoint[] = [];
    for (let y = 0; y <= years; y++) {
        const contributed = totalContributed(amountPerPeriod, frequency, y);
        const value = futureValueOfSeries(amountPerPeriod, frequency, annualRatePercent, y);
        points.push({ year: y, contributed, value, growth: value - contributed });
    }
    return points;
}

/** Compact Indian money formatting: 1.2 Cr, 3.4 L, 12,500. */
export function formatCompactINR(value: number): string {
    const v = Math.round(value);
    if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`;
    if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(2)} L`;
    if (v >= 1_000) return `₹${(v / 1_000).toFixed(1)}K`;
    return `₹${v.toLocaleString('en-IN')}`;
}
