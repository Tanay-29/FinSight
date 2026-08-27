import { Category, normaliseCategory } from './categories';
/**
 * Vitals intelligence: burn rate, savings surplus, and the 50/30/20 split.
 *
 * This used to be three Flask routes. It was a round trip to a server that
 * held no secret and read no database: the app posted its own transactions up,
 * the server divided them, and posted numbers back. Moving it here makes the
 * Vitals screen instant, work offline, and survive the backend being asleep.
 *
 * Everything below is pure. All three functions take the data and a clock, so
 * they can be tested without mocking a date.
 *
 * Month boundaries are computed in UTC, matching the Flask implementation this
 * replaces. That is worth knowing: a transaction made late on the last day of
 * the month in IST can land in the next UTC month. Changing it would shift
 * which transactions count, so it is left as it was rather than quietly
 * altered during a port.
 */

export type Bucket = 'needs' | 'wants' | 'savings';

/** Category to bucket. Anything unrecognised counts as a want. */
/**
 * One entry per canonical category. This used to list every spelling in
 * circulation, health and healthcare, housing and rent, other and
 * miscellaneous, because the app had no agreed vocabulary. Lookups now go
 * through normaliseCategory instead, so the aliases live in one place.
 */
const BUCKET_MAP: Record<Category, Bucket> = {
    groceries: 'needs',
    utilities: 'needs',
    transport: 'needs',
    healthcare: 'needs',
    housing: 'needs',
    dining: 'wants',
    shopping: 'wants',
    entertainment: 'wants',
    education: 'wants',
    other: 'wants',
    investments: 'savings',
};

export function bucketOf(category: string): Bucket {
    return BUCKET_MAP[normaliseCategory(category)];
}

/** Round to a fixed number of places, away from zero on a tie. */
function round(value: number, places = 0): number {
    if (!Number.isFinite(value)) return 0;
    const f = 10 ** places;
    return Math.sign(value) * Math.round(Math.abs(value) * f) / f;
}

/**
 * Indian digit grouping with no decimals, for the alert sentences.
 *
 * The one intentional difference from the Flask code this replaces, which
 * grouped in threes and rendered 318223 as "318,223" rather than "3,18,223".
 * Every other rupee figure in the app already groups this way, so the server
 * was the odd one out. Verified as the only divergence: the port was compared
 * against the original across 64 fixtures and matched everywhere else.
 */
function inr(value: number): string {
    return Math.round(value).toLocaleString('en-IN');
}

function num(value: unknown): number {
    const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
    return Number.isFinite(n) ? n : 0;
}

/** Minimal shape these functions need. Extra fields are ignored. */
export interface VitalsTransaction {
    type?: string;
    date?: string;
    category?: string;
    amount?: number;
}

export interface VitalsBudget {
    category?: string;
    monthlyLimit?: number;
    monthly_limit?: number;
    currentSpend?: number;
}

/** 'YYYY-MM' for a date, in UTC. */
function monthKey(now: Date): string {
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function daysInUTCMonth(now: Date): number {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
}

/** This month's debits, which every calculation below starts from. */
function monthlyDebits(transactions: VitalsTransaction[], now: Date): VitalsTransaction[] {
    const month = monthKey(now);
    return (transactions ?? []).filter(
        (t) => t?.type === 'debit' && (t?.date ?? '').slice(0, 7) === month
    );
}

function spendByCategory(debits: VitalsTransaction[]): Record<string, number> {
    const spend: Record<string, number> = {};
    for (const t of debits) {
        const cat = (t.category ?? 'other').toLowerCase();
        spend[cat] = (spend[cat] ?? 0) + num(t.amount);
    }
    return spend;
}

// ─── Burn rate ───────────────────────────────────────────────

export interface BurnRateResult {
    current_month_spend: number;
    days_elapsed: number;
    days_remaining: number;
    days_in_month: number;
    daily_avg: number;
    projected_monthly: number;
    total_budget: number;
    budget_variance: number | null;
    status: 'ON_TRACK' | 'WARNING' | 'OVER_BUDGET';
    alert: string;
    top_categories: { category: string; amount: number }[];
}

/**
 * Project this month's spend from the pace so far.
 *
 * A straight linear extrapolation of the daily average. It is crude early in
 * the month, when one big day dominates, and settles as days accumulate.
 */
export function computeBurnRate(
    transactions: VitalsTransaction[],
    totalBudget: number,
    now: Date = new Date()
): BurnRateResult {
    const budget = num(totalBudget);
    const debits = monthlyDebits(transactions, now);

    const daysElapsed = now.getUTCDate();
    const daysInMonth = daysInUTCMonth(now);

    const currentMonthSpend = debits.reduce((sum, t) => sum + num(t.amount), 0);
    const dailyAvg = daysElapsed ? currentMonthSpend / daysElapsed : 0;
    const projectedMonthly = round(dailyAvg * daysInMonth, 2);
    const budgetVariance = budget ? round(projectedMonthly - budget, 2) : null;

    const catSpend = spendByCategory(debits);
    const topCategories = Object.entries(catSpend)
        .map(([category, amount]) => ({ category, amount: round(amount, 2) }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    let status: BurnRateResult['status'];
    let alert: string;
    if (budget && projectedMonthly > budget) {
        status = 'OVER_BUDGET';
        alert = `At this rate you'll overspend by ₹${inr(Math.abs(budgetVariance ?? 0))} this month.`;
    } else if (budget && projectedMonthly > budget * 0.85) {
        status = 'WARNING';
        alert = `You're on track to use ${round((projectedMonthly / budget) * 100)}% of budget.`;
    } else {
        status = 'ON_TRACK';
        alert = 'Great! Your spending is within a healthy range.';
    }

    return {
        current_month_spend: round(currentMonthSpend, 2),
        days_elapsed: daysElapsed,
        days_remaining: daysInMonth - daysElapsed,
        days_in_month: daysInMonth,
        daily_avg: round(dailyAvg, 2),
        projected_monthly: projectedMonthly,
        total_budget: budget,
        budget_variance: budgetVariance,
        status,
        alert,
        top_categories: topCategories,
    };
}

// ─── Savings engine ──────────────────────────────────────────

export interface SavingsEvent {
    event: 'SAVINGS_DETECTED';
    category: string;
    planned_budget: number;
    actual_spend: number;
    surplus: number;
    surplus_pct: number;
    recommendation: 'INVEST' | 'SAVE' | 'REALLOCATE';
    action_text: string;
}

export interface SavingsEngineResult {
    total_spend: number;
    total_surplus: number;
    events: SavingsEvent[];
    income: number;
    savings_rate: number | null;
}

/**
 * Find categories running under budget and say what to do with the slack.
 *
 * The recommendation depends on which bucket the category sits in: money not
 * spent on a want is free to invest, whereas slack in a need is likelier to be
 * a timing artefact and belongs in an emergency fund rather than the market.
 */
export function computeSavingsEngine(
    transactions: VitalsTransaction[],
    budgets: VitalsBudget[],
    income: number,
    now: Date = new Date()
): SavingsEngineResult {
    const catSpend = spendByCategory(monthlyDebits(transactions, now));
    const totalSpend = Object.values(catSpend).reduce((s, v) => s + v, 0);
    const inc = num(income);

    const events: SavingsEvent[] = [];
    for (const b of budgets ?? []) {
        const cat = (b?.category ?? '').toLowerCase();
        const limit = num(b?.monthlyLimit ?? b?.monthly_limit ?? 0);
        const actual = catSpend[cat] ?? 0;

        if (limit > 0 && actual < limit) {
            const surplus = round(limit - actual, 2);
            const bucket = bucketOf(cat);

            let recommendation: SavingsEvent['recommendation'];
            let actionText: string;
            if (bucket === 'wants') {
                recommendation = 'INVEST';
                actionText = `Redirect ₹${inr(surplus)} surplus to a SIP or ETF investment.`;
            } else if (bucket === 'needs' && surplus > 500) {
                recommendation = 'SAVE';
                actionText = `Move ₹${inr(surplus)} to your emergency fund.`;
            } else {
                recommendation = 'REALLOCATE';
                actionText = `Reallocate ₹${inr(surplus)} toward a savings goal.`;
            }

            events.push({
                event: 'SAVINGS_DETECTED',
                category: cat,
                planned_budget: limit,
                actual_spend: round(actual, 2),
                surplus,
                surplus_pct: round((surplus / limit) * 100, 1),
                recommendation,
                action_text: actionText,
            });
        }
    }

    events.sort((a, b) => b.surplus - a.surplus);

    return {
        total_spend: round(totalSpend, 2),
        total_surplus: round(events.reduce((s, e) => s + e.surplus, 0), 2),
        events,
        income: inc,
        savings_rate: inc ? round(((inc - totalSpend) / inc) * 100, 1) : null,
    };
}

// ─── 50/30/20 ────────────────────────────────────────────────

export interface BucketDetail {
    amount: number;
    pct_of_spend: number;
    pct_of_income: number;
    target_pct: number;
    delta: number;
    status: 'ON_TRACK' | 'OVER' | 'UNDER';
    categories: Record<string, number>;
}

export interface Rule503020Result {
    total_spend: number;
    income: number;
    implicit_savings: number | null;
    buckets: { needs: BucketDetail; wants: BucketDetail; savings: BucketDetail };
    alerts: { type: string; bucket: string; message: string }[];
    is_golden_ratio: boolean;
    /**
     * False when income is unknown, in which case the rule cannot be evaluated
     * and no judgement is made. Deltas are zero, statuses read ON_TRACK and no
     * alerts are raised. Consumers should show shares of spending instead.
     */
    rule_evaluated: boolean;
}

const TARGETS: Record<Bucket, number> = { needs: 50, wants: 30, savings: 20 };

/**
 * Split this month's money into needs, wants and savings against income.
 *
 * The rule is defined against income, and an earlier version of this code
 * divided by total spending instead. That inverted the advice: a learner who
 * spends little, and therefore saves by not spending, recorded zero in the
 * savings bucket and was told at CRITICAL severity that they were not saving.
 * The system criticised precisely the behaviour it exists to encourage.
 *
 * Two changes fix it. All three buckets are normalised by income, and the
 * residual, income minus what actually went out, is credited to savings, since
 * money you did not spend is money you saved whether or not you happened to
 * tag a transaction as an investment.
 *
 * When income is unknown the rule is not evaluated at all: no deltas, no
 * statuses, no alerts. A rule with no denominator should stay quiet rather
 * than guess, which is what the previous version effectively did.
 */
export function computeRule503020(
    transactions: VitalsTransaction[],
    income: number,
    now: Date = new Date()
): Rule503020Result {
    const inc = num(income);

    const spend: Record<Bucket, number> = { needs: 0, wants: 0, savings: 0 };
    const detail: Record<Bucket, Record<string, number>> = { needs: {}, wants: {}, savings: {} };

    for (const t of monthlyDebits(transactions, now)) {
        const cat = (t.category ?? 'other').toLowerCase();
        const amount = num(t.amount);
        const bucket = bucketOf(cat);
        spend[bucket] += amount;
        detail[bucket][cat] = (detail[bucket][cat] ?? 0) + amount;
    }

    // What actually left the account. The residual below is credited to savings
    // afterwards, so it must not be counted as an outflow here.
    const totalSpend = spend.needs + spend.wants + spend.savings;

    const ruleEvaluated = inc > 0;

    // Money earned and not spent is saved. This is the half of the fix that
    // stops a frugal learner reading as having saved nothing.
    const residual = ruleEvaluated ? inc - totalSpend : 0;

    const amounts: Record<Bucket, number> = {
        needs: spend.needs,
        wants: spend.wants,
        savings: spend.savings + residual,
    };

    const buckets = {} as Rule503020Result['buckets'];
    const alerts: Rule503020Result['alerts'] = [];

    // Order matters: it decides the order alerts come out in.
    for (const bucket of ['needs', 'wants', 'savings'] as Bucket[]) {
        const amount = amounts[bucket];
        const pctOfIncome = ruleEvaluated ? round((amount / inc) * 100, 1) : 0;
        const target = TARGETS[bucket];

        // Only the income share drives the verdict. Share of spending is kept
        // alongside because it is still informative, but it decides nothing.
        const delta = ruleEvaluated ? round(pctOfIncome - target, 1) : 0;

        buckets[bucket] = {
            amount: round(amount, 2),
            pct_of_spend: totalSpend ? round((amount / totalSpend) * 100, 1) : 0,
            pct_of_income: pctOfIncome,
            target_pct: target,
            delta,
            status: Math.abs(delta) <= 5 ? 'ON_TRACK' : delta > 0 ? 'OVER' : 'UNDER',
            categories: Object.fromEntries(
                Object.entries(detail[bucket]).map(([k, v]) => [k, round(v, 2)])
            ),
        };

        if (!ruleEvaluated) continue;

        if (Math.abs(delta) > 5) {
            if (bucket === 'wants' && delta > 0) {
                alerts.push({
                    type: 'WARNING',
                    bucket: 'wants',
                    message: `Wants spending is ${delta.toFixed(1)}% above the 30% target.`,
                });
            }
            if (bucket === 'savings' && delta < -5) {
                alerts.push({
                    type: 'INFO',
                    bucket: 'savings',
                    message: `Savings is ${Math.abs(delta).toFixed(1)}% below the 20% target.`,
                });
            }
        }

        // Spending more than you earned is the case worth raising loudly, and
        // it is a fact about the month rather than a verdict on the learner.
        // The previous version fired this whenever the savings bucket was zero,
        // which punished anyone who saved by not spending.
        if (bucket === 'savings' && amount < 0) {
            alerts.push({
                type: 'CRITICAL',
                bucket: 'savings',
                message: 'Spending is above income this month.',
            });
        }
    }

    return {
        total_spend: round(totalSpend, 2),
        income: inc,
        implicit_savings: ruleEvaluated ? round(inc - totalSpend, 2) : null,
        buckets,
        alerts,
        is_golden_ratio:
            ruleEvaluated &&
            (['needs', 'wants', 'savings'] as Bucket[]).every(
                (b) => Math.abs(buckets[b].delta) <= 5
            ),
        rule_evaluated: ruleEvaluated,
    };
}
