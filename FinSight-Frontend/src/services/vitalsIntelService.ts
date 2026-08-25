/**
 * vitalsIntelService.ts
 *
 * These three used to POST to the Flask vitals routes. They now compute
 * locally: the server held no secret and read no database, it just did
 * arithmetic on transactions the app had already loaded. The Vitals screen is
 * now instant, works offline, and no longer depends on the backend being
 * awake.
 *
 * The functions stay async and keep their signatures so the thunks in
 * vitalsIntelSlice are unchanged. The maths lives in utils/vitals.
 */
import {
    computeBurnRate, computeSavingsEngine, computeRule503020,
    VitalsTransaction, VitalsBudget,
    BurnRateResult, SavingsEngineResult, Rule503020Result,
} from '../utils/vitals';

// Re-exported so existing importers of this module keep working unchanged.
export type {
    BurnRateResult, SavingsEvent, SavingsEngineResult,
    BucketDetail, Rule503020Result,
} from '../utils/vitals';

export const fetchBurnRate = async (
    transactions: VitalsTransaction[],
    total_budget: number
): Promise<BurnRateResult> => computeBurnRate(transactions, total_budget);

export const fetchSavingsEngine = async (
    transactions: VitalsTransaction[],
    budgets: VitalsBudget[],
    income: number
): Promise<SavingsEngineResult> => computeSavingsEngine(transactions, budgets, income);

export const fetchRule503020 = async (
    transactions: VitalsTransaction[],
    income: number
): Promise<Rule503020Result> => computeRule503020(transactions, income);
