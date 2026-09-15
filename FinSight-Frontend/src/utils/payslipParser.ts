/**
 * Reads the lines off a pasted payslip and files each one as an earning, a
 * deduction, or the net. Labels vary by payroll vendor but the vocabulary
 * is small: basic, HRA, allowances on one side; PF, professional tax, TDS,
 * ESI on the other. Anything with an amount that matches nothing is kept
 * as "unrecognised" so the learner can see it was not silently dropped.
 *
 * Same discipline as the other parsers: on device, nothing stored.
 */

export type LineKind = 'earning' | 'deduction' | 'net' | 'gross' | 'unknown';

export interface PayslipLine {
    label: string;
    amount: number;
    kind: LineKind;
    /** A canonical key when recognised, e.g. 'basic', 'employeePf'. */
    key?: string;
    note?: string;
}

export interface ParsedPayslip {
    lines: PayslipLine[];
    earnings: number;
    deductions: number;
    /** Net as printed, if a net line was found. */
    netPrinted?: number;
    grossPrinted?: number;
    /** Earnings minus deductions, from the lines that were read. */
    netComputed: number;
    flags: string[];
}

interface Rule { key: string; kind: LineKind; re: RegExp; note?: string }

const RULES: Rule[] = [
    { key: 'net', kind: 'net', re: /\b(net\s*(pay|salary|amount|payable)|take[\s-]*home|amount\s*credited)\b/i },
    { key: 'gross', kind: 'gross', re: /\b(gross\s*(pay|salary|earnings?)|total\s*earnings?)\b/i },
    { key: 'totalDeductions', kind: 'gross', re: /\btotal\s*deductions?\b/i },
    { key: 'basic', kind: 'earning', re: /\bbasic\b/i, note: 'Base for PF, HRA and gratuity. Usually 35 to 50 percent of CTC.' },
    { key: 'hra', kind: 'earning', re: /\b(hra|house\s*rent)\b/i, note: 'Tax-exempt under the old regime only, and only with rent receipts.' },
    { key: 'da', kind: 'earning', re: /\b(da|dearness)\b/i, note: 'Dearness allowance. Common in government and PSU pay, rare in private.' },
    { key: 'lta', kind: 'earning', re: /\b(lta|leave\s*travel)\b/i, note: 'Leave travel allowance. Exempt twice in four years, old regime, with tickets.' },
    { key: 'conveyance', kind: 'earning', re: /\b(conveyance|transport\s*allow)/i },
    { key: 'medical', kind: 'earning', re: /\bmedical\s*allow/i },
    { key: 'special', kind: 'earning', re: /\b(special|other|flexi|flexible)\s*(allowance|pay|benefit)/i, note: 'The balancing figure that makes the structure add up to gross. Fully taxable.' },
    { key: 'bonus', kind: 'earning', re: /\b(bonus|incentive|variable)\b/i, note: 'Not guaranteed. Budget on months without it.' },
    { key: 'arrears', kind: 'earning', re: /\barrears?\b/i },
    { key: 'reimb', kind: 'earning', re: /\breimburse/i },
    { key: 'employerPf', kind: 'unknown', re: /\b(employer|company)['s]*\s*(pf|epf|provident|contribution)/i, note: 'Employer PF. Part of CTC, not part of your gross; most payslips show it for information only.' },
    { key: 'employeePf', kind: 'deduction', re: /\b(pf|epf|provident\s*fund)\b/i, note: '12 percent of basic. Yours, sitting in EPFO, growing at the EPF rate.' },
    { key: 'vpf', kind: 'deduction', re: /\b(vpf|voluntary\s*pf)\b/i },
    { key: 'pt', kind: 'deduction', re: /\b(professional\s*tax|prof\.?\s*tax|p\.?\s*tax|ptax)\b/i, note: 'A state levy, capped at 2,500 a year. Usually 200 a month.' },
    { key: 'tds', kind: 'deduction', re: /\b(tds|income\s*tax|i\.?\s*tax|tax\s*deducted)\b/i, note: 'Income tax deducted at source, on the year projected from your declaration.' },
    { key: 'esi', kind: 'deduction', re: /\b(esi|esic)\b/i, note: 'Employee State Insurance. Applies below 21,000 gross a month; 0.75 percent of gross.' },
    { key: 'lwf', kind: 'deduction', re: /\b(lwf|labour\s*welfare)\b/i },
    { key: 'insurance', kind: 'deduction', re: /\b(insurance|mediclaim|gmc|gpa)\b/i, note: 'Your share of a group policy. Check what it actually covers.' },
    { key: 'loan', kind: 'deduction', re: /\b(loan|advance|recovery)\b/i, note: 'A recovery. If you did not take one, ask payroll.' },
    { key: 'nps', kind: 'deduction', re: /\b(nps|pension)\b/i },
    { key: 'lop', kind: 'deduction', re: /\b(lop|loss\s*of\s*pay|absent)/i, note: 'Loss of pay. Check the days match your leave record.' },
];

const AMOUNT_AT_END = /(?:rs\.?|inr|₹)?\s*(-?[0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*$/i;

function toNumber(s: string): number | undefined {
    const n = Number(s.replace(/,/g, ''));
    return Number.isFinite(n) ? Math.abs(n) : undefined;
}

export function parsePayslip(text: string): ParsedPayslip {
    const lines: PayslipLine[] = [];
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim().replace(/\s+/g, ' ');
        if (!line) continue;
        const m = line.match(AMOUNT_AT_END);
        if (!m) continue;
        const amount = toNumber(m[1]);
        if (amount === undefined) continue;
        const label = line.slice(0, m.index).replace(/[:\-\t]+$/g, '').trim();
        if (!label || /^(date|month|period|pay\s*slip|payslip|salary\s*slip|employee\s*(id|code|no|name)|emp\s*(id|code|no)|uan|pan|bank|account|days|paid\s*days|lop\s*days)/i.test(label)) continue;
        const rule = RULES.find((r) => r.re.test(label));
        lines.push({ label, amount, kind: rule?.kind ?? 'unknown', key: rule?.key, note: rule?.note });
    }

    const earnings = lines.filter((l) => l.kind === 'earning').reduce((n, l) => n + l.amount, 0);
    const deductions = lines.filter((l) => l.kind === 'deduction').reduce((n, l) => n + l.amount, 0);
    const net = lines.find((l) => l.key === 'net');
    const gross = lines.find((l) => l.key === 'gross');
    const netComputed = earnings - deductions;

    const flags: string[] = [];
    const basic = lines.find((l) => l.key === 'basic');
    const pf = lines.find((l) => l.key === 'employeePf');
    const pt = lines.find((l) => l.key === 'pt');
    if (basic && !pf) flags.push('No employee PF line. If you are on payroll with basic above a token amount, PF should be deducted; ask why.');
    if (basic && pf && pf.amount > basic.amount * 0.125 + 1 && pf.amount > 1_800 + 1) {
        flags.push(`PF of ${pf.amount.toLocaleString('en-IN')} is above 12 percent of basic. It may include VPF; if not, check.`);
    }
    if (pt && pt.amount > 300) flags.push(`Professional tax of ${pt.amount.toLocaleString('en-IN')} in one month is above any state's monthly rate. It may be a catch-up; worth asking.`);
    if (net && Math.abs(net.amount - netComputed) > Math.max(50, net.amount * 0.02) && earnings > 0) {
        flags.push(`Printed net (${net.amount.toLocaleString('en-IN')}) does not match earnings minus deductions from the lines read (${Math.round(netComputed).toLocaleString('en-IN')}). A line was probably missed or misfiled below.`);
    }
    if (gross && basic && basic.amount < gross.amount * 0.3) flags.push('Basic is under 30 percent of gross. Low basic means low PF and gratuity; some employers structure it this way to lift take-home.');
    if (lines.some((l) => l.key === 'loan')) flags.push('There is a loan or advance recovery. Confirm it is one you took.');

    return { lines, earnings, deductions, netPrinted: net?.amount, grossPrinted: gross?.amount, netComputed, flags };
}

export const SAMPLE_PAYSLIP = `Payslip for September 2026
Basic 20,000
HRA 10,000
Special Allowance 17,600
Gross Salary 47,600
Employee PF 2,400
Professional Tax 200
TDS 0
Total Deductions 2,600
Net Pay 45,000`;
