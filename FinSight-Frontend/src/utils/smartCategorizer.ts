/**
 * Clipboard parser for bank SMS.
 *
 * Keyword rules live in utils/merchantRules, which this and the notification
 * parser share. They previously kept separate tables that disagreed, so the
 * same transaction could be categorised differently depending on whether it
 * arrived by paste or by notification.
 *
 * AddTransactionScreen carried a third copy, and that was the only one users
 * ever reached. It matched keywords by plain substring and stopped at the first
 * category in declaration order, so `gas` matched Vegas, `sip` matched gossip,
 * `prime` matched Amazon Prime and `vi` matched prime video. The amount and
 * direction handling in that copy was better than this one's, so it is kept
 * here rather than thrown away with the rest of it.
 */
import { matchMerchant } from './merchantRules';

export interface ParsedSMS {
    amount: number;
    category: string;
    merchant: string;
    type: 'debit' | 'credit';
    /** The day the message names, as an ISO string, or now when it names none. */
    date: string;
    /** True when `date` came from the message rather than the clock. */
    dated: boolean;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * The transaction date in a bank message, if it has one: "05-Nov-26",
 * "5 Nov 2026", "05Nov26", "05/11/26", "05-11-2026" or "2026-11-05". Indian
 * banks write the day first. Anything that is not a real day, or is in the
 * future, or is more than a year old, is ignored and the caller uses today.
 */
export const parseSmsDate = (text: string, now: Date = new Date()): Date | null => {
    let d: number | undefined;
    let m: number | undefined;
    let y: number | undefined;
    // "05 deb..." also fits the shape, so take the first whose word is a month.
    const named = [...text.matchAll(/\b(\d{1,2})[-\s/]?([A-Za-z]{3})[a-z]*[-\s/,]*(\d{4}|\d{2})\b/g)]
        .find((x) => MONTHS.includes(x[2].toLowerCase()));
    const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    const numeric = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})\b/);
    if (named) {
        d = Number(named[1]); m = MONTHS.indexOf(named[2].toLowerCase()); y = Number(named[3]);
    } else if (iso) {
        y = Number(iso[1]); m = Number(iso[2]) - 1; d = Number(iso[3]);
    } else if (numeric) {
        d = Number(numeric[1]); m = Number(numeric[2]) - 1; y = Number(numeric[3]);
    }
    if (d === undefined || m === undefined || y === undefined) return null;
    if (y < 100) y += 2000;
    // Midday, so a time zone shift can never move it to another day.
    const date = new Date(y, m, d, 12);
    if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return null;
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    if (date > endOfToday || date < yearAgo) return null;
    return date;
};

/**
 * Pull a transaction out of a pasted bank message.
 *
 * `corrections` maps a merchant to the category the user has already put it in
 * by hand. Passing it lets a paste land in the right category the first time
 * for a merchant the built-in rules have never heard of.
 */
export const parseBankSMS = (
    smsText: string,
    corrections: Record<string, string> = {}
): ParsedSMS => {
    const lowerText = smsText.toLowerCase();

    // Banks phrase the amount half a dozen ways. Try the explicit forms first,
    // then fall back to the first plain decimal, which catches "103.00" in
    // messages that name no currency at all.
    let amount = 0;
    const explicit = smsText.match(
        /(?:rs\.?|inr|₹|debited by|payment of|paid)\s*([\d,]+\.?\d*)/i
    );
    if (explicit) {
        amount = parseFloat(explicit[1].replace(/,/g, ''));
    } else {
        const fallback = smsText.match(/([\d,]+\.\d{2})/);
        if (fallback) amount = parseFloat(fallback[1].replace(/,/g, ''));
    }

    // Longest match first, on word boundaries, over the built-in rules plus
    // anything the user has corrected. See utils/merchantRules for why both of
    // those matter more than they look.
    let category = 'other';
    let merchant = 'Unknown Merchant';
    const match = matchMerchant(lowerText, corrections);
    if (match) {
        category = match.category;
        merchant = match.keyword.charAt(0).toUpperCase() + match.keyword.slice(1);
    }

    const isCredit =
        lowerText.includes('credited') ||
        lowerText.includes('received') ||
        lowerText.includes('deposited');

    // A message about today keeps the current time, so it sorts as the
    // latest entry; an older one goes on the day it names.
    const now = new Date();
    const named = parseSmsDate(smsText, now);
    const dated = !!named && named.toDateString() !== now.toDateString();

    return {
        amount,
        category,
        merchant,
        type: isCredit ? 'credit' : 'debit',
        date: (dated && named ? named : now).toISOString(),
        dated,
    };
};
