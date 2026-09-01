/**
 * What the app knows about money coming in.
 *
 * Income was write-only. You could log it, it appeared in the transaction
 * list, and nothing anywhere read it: every figure in the app filtered on
 * `type === 'debit'` before it looked at anything else. So the question "what
 * is the point of adding my income" had no answer.
 *
 * Two things were already wrong because of that.
 *
 * The 50/30/20 screen divided each bucket by total spending. Fifty, thirty and
 * twenty are percentages of income, and dividing by spending instead makes the
 * three buckets add up to a hundred no matter what you earn, which means the
 * rule can never be failed and never be passed. It also called
 * savings-as-a-share-of-spending a "savings rate", which is a different number
 * with the same name.
 *
 * The burn rate screen guessed income from the five-band question in
 * onboarding, mapping "15k to 40k" to 27,500, while the real figure the user
 * had typed sat unread in their transactions.
 *
 * Everything here prefers what was logged and falls back to the band, and it
 * always says which it used, because a number derived from a guess should not
 * be presented as if it were measured.
 */

export interface MonthlyIncome {
    amount: number;
    /** Where the number came from, so the UI can be honest about it. */
    source: 'logged' | 'estimated' | 'unknown';
}

/** Midpoints of the onboarding bands. A fallback, never a measurement. */
const INCOME_BANDS: Record<string, number> = {
    under_15k: 12000,
    '15k_40k': 27500,
    '40k_80k': 60000,
    above_80k: 100000,
    prefer_not: 0,
};

export const incomeFromBand = (band?: string): number =>
    (band ? INCOME_BANDS[band] : undefined) ?? 0;

interface Txn {
    type: string;
    amount: number;
    date: string;
}

/** Credits inside one calendar month, as 'yyyy-MM'. */
export function loggedIncome(transactions: Txn[], monthKey: string): number {
    return transactions.reduce((sum, t) => {
        if (t.type !== 'credit') return sum;
        return (t.date ?? '').slice(0, 7) === monthKey ? sum + (t.amount || 0) : sum;
    }, 0);
}

/**
 * The month's income, preferring what the user actually logged.
 *
 * The band is only reached for when nothing was logged, because a real figure
 * of 8,000 beats a banded guess of 27,500 even though the guess looks more
 * confident.
 */
export function resolveMonthlyIncome(
    transactions: Txn[],
    incomeRange: string | undefined,
    monthKey: string,
): MonthlyIncome {
    const logged = loggedIncome(transactions, monthKey);
    if (logged > 0) return { amount: logged, source: 'logged' };

    const banded = incomeFromBand(incomeRange);
    if (banded > 0) return { amount: banded, source: 'estimated' };

    return { amount: 0, source: 'unknown' };
}

/**
 * The share of income that did not get spent.
 *
 * This is the number personal finance actually turns on, and the app could not
 * compute it at all before, because it needs both sides of the ledger. Money
 * left sitting in an account counts: not spending it is saving it, whether or
 * not it was moved into an investment.
 *
 * Returns null rather than zero when income is unknown, so a screen cannot
 * accidentally tell someone they save nothing when the truth is that nobody
 * has told the app what they earn.
 */
export function savingsRate(income: number, spend: number): number | null {
    if (income <= 0) return null;
    return ((income - spend) / income) * 100;
}

/** Wording for a savings rate, in the register the rest of the app uses. */
export function savingsRateVerdict(rate: number): { label: string; tone: 'good' | 'ok' | 'poor' } {
    if (rate >= 20) return { label: 'Comfortably ahead', tone: 'good' };
    if (rate >= 10) return { label: 'Holding steady', tone: 'ok' };
    if (rate >= 0) return { label: 'Very little left over', tone: 'poor' };
    return { label: 'Spending more than you earn', tone: 'poor' };
}
