/**
 * Pulls the four numbers that matter out of pasted credit-card statement
 * text: total due, minimum due, due date, and any finance charge. Statement
 * emails and SMS summaries from the large issuers all label these lines in
 * a handful of ways; the patterns below cover the common ones and the
 * screen shows what it found so the learner can check.
 *
 * Same spirit as smartCategorizer.ts: regex over pasted text, on device,
 * nothing leaves the phone.
 */

export interface ParsedStatement {
    totalDue?: number;
    minimumDue?: number;
    dueDate?: string;
    financeCharge?: number;
    creditLimit?: number;
    /** Which lines each figure came from, for the "here is what I read" panel. */
    evidence: { field: string; line: string }[];
}

const AMOUNT = String.raw`(?:rs\.?|inr|₹)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)`;

const PATTERNS: { field: keyof Omit<ParsedStatement, 'evidence' | 'dueDate'>; re: RegExp }[] = [
    { field: 'totalDue', re: new RegExp(String.raw`(?:total\s+(?:amount\s+)?due|total\s+outstanding|statement\s+balance|closing\s+balance|amount\s+payable|tad)\s*[:\-]?\s*${AMOUNT}`, 'i') },
    { field: 'minimumDue', re: new RegExp(String.raw`(?:min(?:imum)?\.?\s+(?:amount\s+)?(?:due|payable)|mad)\s*[:\-]?\s*${AMOUNT}`, 'i') },
    { field: 'financeCharge', re: new RegExp(String.raw`(?:finance\s+charges?|interest\s+charged|interest\s+amount)\s*[:\-]?\s*${AMOUNT}`, 'i') },
    { field: 'creditLimit', re: new RegExp(String.raw`(?:credit\s+limit|total\s+limit)\s*[:\-]?\s*${AMOUNT}`, 'i') },
];

const DATE = new RegExp(String.raw`(?:payment\s+)?due\s+(?:date|by|on)\s*[:\-]?\s*([0-9]{1,2}[\s\-/][A-Za-z]{3,9}[\s\-/,]*[0-9]{2,4}|[0-9]{1,2}[\-/][0-9]{1,2}[\-/][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]{3,9})`, 'i');

function toNumber(s: string): number | undefined {
    const n = Number(s.replace(/,/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function parseStatement(text: string): ParsedStatement {
    const out: ParsedStatement = { evidence: [] };
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const whole = lines.join(' ');

    for (const { field, re } of PATTERNS) {
        const m = whole.match(re);
        if (!m) continue;
        const value = toNumber(m[1]);
        if (value === undefined) continue;
        out[field] = value;
        const line = lines.find((l) => re.test(l)) ?? m[0];
        out.evidence.push({ field, line: line.slice(0, 80) });
    }

    const d = whole.match(DATE);
    if (d) {
        out.dueDate = d[1].trim();
        out.evidence.push({ field: 'dueDate', line: (lines.find((l) => DATE.test(l)) ?? d[0]).slice(0, 80) });
    }

    // Sanity: a minimum larger than the total is a misread, drop the smaller
    // confidence figure rather than show nonsense.
    if (out.totalDue !== undefined && out.minimumDue !== undefined && out.minimumDue > out.totalDue) {
        delete out.minimumDue;
        out.evidence = out.evidence.filter((e) => e.field !== 'minimumDue');
    }
    return out;
}

/** A realistic statement summary for the "try an example" button. */
export const SAMPLE_STATEMENT = `Your credit card statement for Sep 2026 is ready.
Total Amount Due: Rs. 18,450.00
Minimum Amount Due: Rs. 922.00
Payment Due Date: 18 Oct 2026
Credit Limit: Rs. 1,00,000
Finance Charges: Rs. 0.00
Reward points earned: 540`;
