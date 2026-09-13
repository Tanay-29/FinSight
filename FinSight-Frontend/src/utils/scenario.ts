/**
 * The life-sim engine. Pure: a scenario plus a list of choices in, the
 * state of every month out, so the whole year can be replayed or checked.
 *
 * A month runs in this order:
 *   1. salary lands
 *   2. fixed costs and every recurring commitment leave
 *   3. investments transfer out
 *   4. interest accrues on any carried debt, and the bureau notices: a month
 *      with a card or loan and nothing overdue builds credit health, a month
 *      carrying card debt erodes it
 *   5. the month's decision applies its effect
 *
 * Cash can go negative. That is not a bug, it is the month you could not
 * make rent, and the screen says so.
 */
import type { Scenario, Scene, Option, Effect } from '../data/scenarios/schema';

export interface Commitment { label: string; amount: number }

export interface SimState {
    month: number;
    cash: number;
    debt: number;
    invested: number;
    credit: number;
    peace: number;
    commitments: Commitment[];
    monthlyInvest: number;
    flags: Set<string>;
}

export interface MonthLedger {
    income: number;
    fixed: number;
    commitments: number;
    invested: number;
    interest: number;
}

export interface Choice { sceneId: string; optionIndex: number }

const clamp100 = (n: number) => Math.max(0, Math.min(100, n));

export function initialState(s: Scenario): SimState {
    return {
        month: 0,
        cash: s.start.cash,
        debt: 0,
        invested: 0,
        credit: s.start.credit,
        peace: s.start.peace,
        commitments: [],
        monthlyInvest: 0,
        flags: new Set(),
    };
}

/** Steps 1 to 4: the month's arithmetic before any decision. */
export function openMonth(s: Scenario, state: SimState): { state: SimState; ledger: MonthLedger } {
    const fixed = s.start.fixedCosts.reduce((n, c) => n + c.amount, 0);
    const commitments = state.commitments.reduce((n, c) => n + c.amount, 0);
    const interest = Math.round(state.debt * s.debtMonthlyRate);
    const hasFile = state.flags.has('hasCard') || state.commitments.some((c) => c.amount > 0);
    const creditDrift = state.debt > 0 ? -1 : hasFile ? 2 : 0;
    const next: SimState = {
        ...state,
        month: state.month + 1,
        credit: clamp100(state.credit + creditDrift),
        cash: state.cash + s.start.monthlyIncome - fixed - commitments - state.monthlyInvest,
        invested: state.invested + state.monthlyInvest,
        debt: state.debt + interest,
        flags: new Set(state.flags),
    };
    return {
        state: next,
        ledger: { income: s.start.monthlyIncome, fixed, commitments, invested: state.monthlyInvest, interest },
    };
}

/** Step 5. */
export function applyEffect(state: SimState, e: Effect): SimState {
    const flags = new Set(state.flags);
    if (e.setFlag) flags.add(e.setFlag);
    const cashAfter = state.cash + (e.cash ?? 0);
    const repay = Math.min(e.payDebt ?? 0, state.debt, Math.max(0, cashAfter));
    const once = Math.min(e.investOnce ?? 0, Math.max(0, cashAfter - repay));
    return {
        ...state,
        cash: cashAfter - repay - once,
        invested: state.invested + once,
        debt: Math.max(0, state.debt + (e.debt ?? 0) - repay),
        credit: clamp100(state.credit + (e.credit ?? 0)),
        peace: clamp100(state.peace + (e.peace ?? 0)),
        commitments: e.monthly ? [...state.commitments, e.monthly] : state.commitments,
        monthlyInvest: state.monthlyInvest + (e.invest ?? 0),
        flags,
    };
}

/** Whether a scene plays given the flags so far. */
export function sceneVisible(scene: Scene, state: SimState): boolean {
    if (scene.showIfFlag && !state.flags.has(scene.showIfFlag)) return false;
    if (scene.hideIfFlag && state.flags.has(scene.hideIfFlag)) return false;
    return true;
}

export type OptionAvailability = { ok: true } | { ok: false; reason: string };

export function optionAvailable(o: Option, state: SimState): OptionAvailability {
    if (o.requiresFlag && !state.flags.has(o.requiresFlag)) return { ok: false, reason: 'Not an option this time' };
    if (o.requiresCash !== undefined && state.cash < o.requiresCash) {
        return { ok: false, reason: `Needs ${formatShort(o.requiresCash)} on hand, you have ${formatShort(Math.max(0, state.cash))}` };
    }
    return { ok: true };
}

export function visibleOptions(scene: Scene, state: SimState): Option[] {
    return scene.options.filter((o) => !(o.hideIfFlag && state.flags.has(o.hideIfFlag)));
}

export interface Scorecard {
    netWorth: number;
    cash: number;
    invested: number;
    debt: number;
    credit: number;
    peace: number;
    wise: number;
    ok: number;
    costly: number;
    /** The one-line read on the year. */
    verdict: string;
    creditLabel: string;
    peaceLabel: string;
}

export function scorecard(state: SimState, tags: Option['tag'][]): Scorecard {
    const wise = tags.filter((t) => t === 'wise').length;
    const ok = tags.filter((t) => t === 'ok').length;
    const costly = tags.filter((t) => t === 'costly').length;
    const netWorth = state.cash + state.invested - state.debt;
    const creditLabel = state.credit >= 75 ? 'Strong start' : state.credit >= 50 ? 'Building' : state.credit >= 30 ? 'Bruised' : 'Damaged';
    const peaceLabel = state.peace >= 75 ? 'Calm' : state.peace >= 50 ? 'Managing' : state.peace >= 30 ? 'Stretched' : 'Burnt out';
    let verdict: string;
    if (netWorth >= 100_000 && state.debt === 0) verdict = 'A year most people do not have: money saved, nothing owed, and a credit file that opens doors.';
    else if (netWorth >= 40_000 && state.debt < 20_000) verdict = 'Ahead of where you started, with a few choices that cost more than they needed to.';
    else if (netWorth >= 0) verdict = 'You got through it, but the year worked for the lenders more than for you.';
    else verdict = 'The year ended with more owed than owned. Every one of the costly choices below is reversible next time.';
    return { netWorth, cash: state.cash, invested: state.invested, debt: state.debt, credit: state.credit, peace: state.peace, wise, ok, costly, verdict, creditLabel, peaceLabel };
}

function formatShort(n: number): string {
    if (n >= 100_000) return `${(n / 100_000).toFixed(n % 100_000 === 0 ? 0 : 1)}L`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
    return String(Math.round(n));
}
