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
    date: string;
}

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

    return {
        amount,
        category,
        merchant,
        type: isCredit ? 'credit' : 'debit',
        date: new Date().toISOString(),
    };
};
