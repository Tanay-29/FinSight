/**
 * Indian income tax constants, one financial year at a time.
 *
 * Every figure here has a source and a year stamped on it, and nothing in the
 * app computes tax from any other number. The lessons and explorables read
 * these through utils/moneyMath.ts; the model never sees or produces them.
 *
 * When a Budget changes the slabs, add a new entry, point CURRENT_FY at it,
 * and leave the old one in place so a lesson written against it still
 * reproduces the figures it was written with.
 */

export interface Slab {
    /** Taxable income above this amount, in rupees. */
    from: number;
    /** Up to and including this amount. Infinity for the top slab. */
    to: number;
    /** Rate as a fraction: 0.05 is 5 percent. */
    rate: number;
}

export interface RegimeRules {
    slabs: Slab[];
    standardDeduction: number;
    /** Section 87A: taxable income at or below this pays no tax. */
    rebateThreshold: number;
    /** The most the rebate can wipe out. */
    rebateMax: number;
}

export interface TaxYear {
    fy: string;
    ay: string;
    /** Health and education cess on the tax computed. */
    cessRate: number;
    newRegime: RegimeRules;
    oldRegime: RegimeRules;
    /** Old regime only. Caps on the deductions the explorable lets you toggle. */
    caps: {
        section80C: number;
        section80D: number;
        section80CCD1B: number;
        homeLoanInterest24b: number;
    };
    source: string;
}

/**
 * FY 2025-26 (AY 2026-27), as announced in the Union Budget of 1 February
 * 2025 and reproduced on the Income Tax Department portal.
 */
export const FY_2025_26: TaxYear = {
    fy: '2025-26',
    ay: '2026-27',
    cessRate: 0.04,
    newRegime: {
        slabs: [
            { from: 0, to: 400_000, rate: 0 },
            { from: 400_000, to: 800_000, rate: 0.05 },
            { from: 800_000, to: 1_200_000, rate: 0.10 },
            { from: 1_200_000, to: 1_600_000, rate: 0.15 },
            { from: 1_600_000, to: 2_000_000, rate: 0.20 },
            { from: 2_000_000, to: 2_400_000, rate: 0.25 },
            { from: 2_400_000, to: Infinity, rate: 0.30 },
        ],
        standardDeduction: 75_000,
        rebateThreshold: 1_200_000,
        rebateMax: 60_000,
    },
    oldRegime: {
        slabs: [
            { from: 0, to: 250_000, rate: 0 },
            { from: 250_000, to: 500_000, rate: 0.05 },
            { from: 500_000, to: 1_000_000, rate: 0.20 },
            { from: 1_000_000, to: Infinity, rate: 0.30 },
        ],
        standardDeduction: 50_000,
        rebateThreshold: 500_000,
        rebateMax: 12_500,
    },
    caps: {
        section80C: 150_000,
        section80D: 25_000,
        section80CCD1B: 50_000,
        homeLoanInterest24b: 200_000,
    },
    source: 'https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1',
};

export const CURRENT_FY: TaxYear = FY_2025_26;

/**
 * Payroll constants used by the salary slip explorable. These are statutory
 * or near-universal; the salary structure itself (what share of CTC is basic)
 * is an assumption and is labelled as one in utils/moneyMath.ts.
 */
export const PAYROLL = {
    /** Employee and employer each contribute this share of basic to EPF. */
    epfRate: 0.12,
    /** Of the employer's 12 percent, 8.33 percent goes to EPS, on basic capped at 15,000. */
    epsRate: 0.0833,
    epsWageCeiling: 15_000,
    /**
     * Professional tax is a state levy. 200 a month is the common figure in
     * Karnataka, Maharashtra, Telangana and West Bengal; a few states charge
     * nothing. Treated as 200 with the caveat shown in the lesson.
     */
    professionalTaxMonthly: 200,
    source: 'https://www.epfindia.gov.in/site_en/For_Employees.php',
} as const;

/**
 * Credit card constants. Interest rates are what the large issuers publish
 * on their most-issued cards; the minimum-due share is the common figure
 * after the 2024 revisions, and the explorable lets the learner change both.
 */
export const CREDIT_CARD = {
    /** Annual percentage rate range typical of Indian issuers. */
    aprLow: 0.36,
    aprHigh: 0.48,
    aprDefault: 0.42,
    /** Minimum amount due as a share of the statement balance. */
    minimumDueShare: 0.05,
    /** Issuers set a floor so tiny balances still get a minimum. */
    minimumDueFloor: 200,
    /** GST on interest and fees. */
    gstRate: 0.18,
} as const;
