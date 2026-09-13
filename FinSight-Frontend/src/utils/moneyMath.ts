/**
 * Money maths for the lesson engine.
 *
 * Every number a lesson or explorable shows comes from one of these pure
 * functions, reading constants from data/taxConstants.ts. Nothing here talks
 * to the network or the model. Assumptions that are not statutory (how a CTC
 * is split, which state's professional tax) are named in the returned object
 * so the screen can say so.
 */
import { CURRENT_FY, PAYROLL, CREDIT_CARD, RegimeRules, TaxYear } from '../data/taxConstants';

// ─── Tax ─────────────────────────────────────────────────────

/** Tax on a taxable income under one regime's slabs, before rebate and cess. */
export function slabTax(taxable: number, rules: RegimeRules): number {
    let tax = 0;
    for (const s of rules.slabs) {
        if (taxable <= s.from) break;
        const inSlab = Math.min(taxable, s.to) - s.from;
        tax += inSlab * s.rate;
    }
    return tax;
}

export interface RegimeResult {
    grossIncome: number;
    deductions: number;
    taxable: number;
    slabTax: number;
    rebate: number;
    cess: number;
    /** What actually leaves your pocket for the year. */
    total: number;
    effectiveRate: number;
}

function computeRegime(grossIncome: number, deductions: number, rules: RegimeRules, year: TaxYear): RegimeResult {
    const taxable = Math.max(0, grossIncome - deductions);
    const base = slabTax(taxable, rules);
    const rebate = taxable <= rules.rebateThreshold ? Math.min(base, rules.rebateMax) : 0;
    const afterRebate = base - rebate;
    const cess = afterRebate * year.cessRate;
    const total = Math.round(afterRebate + cess);
    return {
        grossIncome,
        deductions,
        taxable,
        slabTax: Math.round(base),
        rebate: Math.round(rebate),
        cess: Math.round(cess),
        total,
        effectiveRate: grossIncome > 0 ? total / grossIncome : 0,
    };
}

/** New regime: the standard deduction is the only one that applies here. */
export function taxNewRegime(grossIncome: number, year: TaxYear = CURRENT_FY): RegimeResult {
    return computeRegime(grossIncome, year.newRegime.standardDeduction, year.newRegime, year);
}

export interface OldRegimeDeductions {
    section80C?: number;
    section80D?: number;
    section80CCD1B?: number;
    hraExempt?: number;
    homeLoanInterest?: number;
}

/** Old regime: standard deduction plus whatever the learner claims, each capped. */
export function taxOldRegime(
    grossIncome: number,
    d: OldRegimeDeductions = {},
    year: TaxYear = CURRENT_FY,
): RegimeResult {
    const total =
        year.oldRegime.standardDeduction +
        Math.min(d.section80C ?? 0, year.caps.section80C) +
        Math.min(d.section80D ?? 0, year.caps.section80D) +
        Math.min(d.section80CCD1B ?? 0, year.caps.section80CCD1B) +
        Math.min(d.homeLoanInterest ?? 0, year.caps.homeLoanInterest24b) +
        Math.max(0, d.hraExempt ?? 0);
    return computeRegime(grossIncome, total, year.oldRegime, year);
}

export interface RegimeComparison {
    newRegime: RegimeResult;
    oldRegime: RegimeResult;
    /** Positive means the new regime saves you this much. */
    newRegimeSaves: number;
    winner: 'new' | 'old' | 'tie';
}

export function compareRegimes(
    grossIncome: number,
    deductions: OldRegimeDeductions = {},
    year: TaxYear = CURRENT_FY,
): RegimeComparison {
    const n = taxNewRegime(grossIncome, year);
    const o = taxOldRegime(grossIncome, deductions, year);
    const diff = o.total - n.total;
    return {
        newRegime: n,
        oldRegime: o,
        newRegimeSaves: diff,
        winner: diff > 0 ? 'new' : diff < 0 ? 'old' : 'tie',
    };
}

/**
 * HRA exemption under the old regime: the least of HRA received, rent paid
 * minus 10 percent of basic, and 50 percent of basic in a metro (40 percent
 * elsewhere). All annual figures.
 */
export function hraExemption(basicAnnual: number, hraAnnual: number, rentAnnual: number, metro: boolean): number {
    const a = hraAnnual;
    const b = Math.max(0, rentAnnual - 0.10 * basicAnnual);
    const c = (metro ? 0.50 : 0.40) * basicAnnual;
    return Math.max(0, Math.min(a, b, c));
}

// ─── Salary slip ─────────────────────────────────────────────

export interface SalaryBreakdown {
    ctcAnnual: number;
    /** Monthly figures from here down. */
    basic: number;
    hra: number;
    specialAllowance: number;
    employerPf: number;
    /** What the offer letter calls "gross": CTC minus the employer's PF. */
    gross: number;
    employeePf: number;
    professionalTax: number;
    tds: number;
    inHand: number;
    /** The gap that surprises people: CTC per month minus in-hand. */
    gapFromCtc: number;
    gapPercent: number;
    assumptions: string[];
}

/**
 * A typical private-sector structure. The 40 percent basic and 50 percent
 * HRA-of-basic are conventions, not law, and appear in `assumptions` so the
 * screen never presents the split as the learner's actual payslip.
 *
 * TDS assumes the new regime with no other income, which is what most
 * first-jobbers end up under.
 */
export function salaryBreakdown(ctcAnnual: number, basicShare = 0.40, year: TaxYear = CURRENT_FY): SalaryBreakdown {
    const ctcMonthly = ctcAnnual / 12;
    const basic = ctcMonthly * basicShare;
    const hra = basic * 0.5;
    const employerPf = basic * PAYROLL.epfRate;
    const gross = ctcMonthly - employerPf;
    const specialAllowance = Math.max(0, gross - basic - hra);
    const employeePf = basic * PAYROLL.epfRate;
    const professionalTax = PAYROLL.professionalTaxMonthly;
    const annualTax = taxNewRegime(gross * 12, year).total;
    const tds = annualTax / 12;
    const inHand = gross - employeePf - professionalTax - tds;
    const gapFromCtc = ctcMonthly - inHand;
    return {
        ctcAnnual,
        basic: r(basic),
        hra: r(hra),
        specialAllowance: r(specialAllowance),
        employerPf: r(employerPf),
        gross: r(gross),
        employeePf: r(employeePf),
        professionalTax,
        tds: r(tds),
        inHand: r(inHand),
        gapFromCtc: r(gapFromCtc),
        gapPercent: ctcMonthly > 0 ? (gapFromCtc / ctcMonthly) * 100 : 0,
        assumptions: [
            `Basic is ${Math.round(basicShare * 100)}% of CTC and HRA is half of basic, a common structure, not a rule`,
            'Professional tax of 200 a month, which varies by state',
            `TDS under the new regime for FY ${year.fy}, with no other income`,
            'No gratuity, bonus or insurance premium inside the CTC',
        ],
    };
}

const r = (n: number) => Math.round(n);

// ─── Credit cards ────────────────────────────────────────────

export interface PayoffResult {
    /** Months until the balance reaches zero. Capped; see `cleared`. */
    months: number;
    totalInterest: number;
    totalPaid: number;
    /** False when the payment never clears the balance within the cap. */
    cleared: boolean;
    /** Balance at the end of each month, for a chart. */
    balances: number[];
}

const PAYOFF_CAP_MONTHS = 240;

/**
 * Pay a fixed amount every month against a card balance at a given APR.
 * Interest is charged monthly on the outstanding balance, which is how a
 * revolving balance behaves once the interest-free period has been lost.
 */
export function fixedPaymentPayoff(balance: number, apr: number, payment: number): PayoffResult {
    const monthlyRate = apr / 12;
    let bal = balance;
    let interest = 0;
    let paid = 0;
    const balances: number[] = [];
    let months = 0;
    while (bal > 0.5 && months < PAYOFF_CAP_MONTHS) {
        const i = bal * monthlyRate;
        interest += i;
        bal += i;
        const p = Math.min(payment, bal);
        bal -= p;
        paid += p;
        months += 1;
        balances.push(Math.max(0, bal));
    }
    return {
        months,
        totalInterest: Math.round(interest),
        totalPaid: Math.round(paid),
        cleared: bal <= 0.5,
        balances,
    };
}

/**
 * Pay only the minimum due each month. The minimum shrinks as the balance
 * shrinks, which is exactly why this takes so long.
 */
export function minimumDuePayoff(
    balance: number,
    apr: number = CREDIT_CARD.aprDefault,
    share: number = CREDIT_CARD.minimumDueShare,
    floor: number = CREDIT_CARD.minimumDueFloor,
): PayoffResult {
    const monthlyRate = apr / 12;
    let bal = balance;
    let interest = 0;
    let paid = 0;
    const balances: number[] = [];
    let months = 0;
    while (bal > 0.5 && months < PAYOFF_CAP_MONTHS) {
        const i = bal * monthlyRate;
        interest += i;
        bal += i;
        const p = Math.min(bal, Math.max(bal * share, floor));
        bal -= p;
        paid += p;
        months += 1;
        balances.push(Math.max(0, bal));
    }
    return {
        months,
        totalInterest: Math.round(interest),
        totalPaid: Math.round(paid),
        cleared: bal <= 0.5,
        balances,
    };
}

/** Standard reducing-balance EMI. */
export function emi(principal: number, annualRate: number, months: number): number {
    if (months <= 0) return 0;
    const rr = annualRate / 12;
    if (rr === 0) return principal / months;
    const f = Math.pow(1 + rr, months);
    return (principal * rr * f) / (f - 1);
}

export interface NoCostEmiResult {
    price: number;
    months: number;
    /** What the lender is really charging, hidden inside the price. */
    interestInBuiltPrice: number;
    processingFee: number;
    gstOnInterestAndFee: number;
    /** The upfront discount you gave up by choosing EMI over paying in full. */
    foregoneDiscount: number;
    trueCost: number;
    /** Total extra paid over the sticker price. */
    extraOverCash: number;
}

/**
 * "No-cost EMI" is a cash-price sale where the interest is rebated as a
 * discount on the sticker, and the buyer still pays a processing fee and GST
 * on the interest component. Both are real money the sticker price hides.
 */
export function noCostEmi(
    price: number,
    months: number,
    lenderRate = 0.15,
    processingFee = 199,
    cashDiscount = 0,
): NoCostEmiResult {
    const monthly = emi(price, lenderRate, months);
    const interest = Math.round(monthly * months - price);
    const gst = Math.round((interest + processingFee) * CREDIT_CARD.gstRate);
    const extra = processingFee + gst + cashDiscount;
    return {
        price,
        months,
        interestInBuiltPrice: interest,
        processingFee,
        gstOnInterestAndFee: gst,
        foregoneDiscount: cashDiscount,
        trueCost: price + extra,
        extraOverCash: extra,
    };
}

// ─── Formatting ──────────────────────────────────────────────

/** Indian grouping: 12,34,567. No decimals; lessons deal in whole rupees. */
export function inr(n: number): string {
    const sign = n < 0 ? '-' : '';
    const s = Math.round(Math.abs(n)).toString();
    if (s.length <= 3) return `${sign}${s}`;
    const last3 = s.slice(-3);
    const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return `${sign}${rest},${last3}`;
}

/** 4,20,000 becomes "4.2L"; 1,50,00,000 becomes "1.5Cr". For sliders and chips. */
export function inrShort(n: number): string {
    const abs = Math.abs(n);
    if (abs >= 10_000_000) return `${(n / 10_000_000).toFixed(abs % 10_000_000 === 0 ? 0 : 1)}Cr`;
    if (abs >= 100_000) return `${(n / 100_000).toFixed(abs % 100_000 === 0 ? 0 : 1)}L`;
    if (abs >= 1_000) return `${(n / 1_000).toFixed(abs % 1_000 === 0 ? 0 : 1)}k`;
    return inr(n);
}

export function monthsLabel(months: number): string {
    if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
    const y = Math.floor(months / 12);
    const m = months % 12;
    if (m === 0) return `${y} year${y === 1 ? '' : 's'}`;
    return `${y}y ${m}m`;
}
