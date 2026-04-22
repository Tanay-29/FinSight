/**
 * vitalsIntelService.ts
 * Communicates with the Flask Vitals Intelligence Layer
 */
import { BACKEND_URL } from '../config/api';

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
    buckets: {
        needs: BucketDetail;
        wants: BucketDetail;
        savings: BucketDetail;
    };
    alerts: { type: string; bucket: string; message: string }[];
    is_golden_ratio: boolean;
}

export const fetchBurnRate = async (
    transactions: any[],
    total_budget: number
): Promise<BurnRateResult> => {
    const res = await fetch(`${BACKEND_URL}/api/vitals/burn-rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, total_budget }),
    });
    if (!res.ok) throw new Error('Failed to fetch burn rate');
    return res.json();
};

export const fetchSavingsEngine = async (
    transactions: any[],
    budgets: any[],
    income: number
): Promise<SavingsEngineResult> => {
    const res = await fetch(`${BACKEND_URL}/api/vitals/savings-engine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, budgets, income }),
    });
    if (!res.ok) throw new Error('Failed to fetch savings engine');
    return res.json();
};

export const fetchRule503020 = async (
    transactions: any[],
    income: number
): Promise<Rule503020Result> => {
    const res = await fetch(`${BACKEND_URL}/api/vitals/503020`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, income }),
    });
    if (!res.ok) throw new Error('Failed to fetch 50/30/20 data');
    return res.json();
};
