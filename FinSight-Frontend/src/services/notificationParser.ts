/**
 * Notification Parser Service
 *
 * Parses Android notification content from UPI/banking apps
 * to extract transaction data automatically.
 *
 * Note: The actual `react-native-android-notification-listener`
 * native module requires a Development Build (not Expo Go).
 * This module handles the parsing logic only.
 */

import { matchMerchant } from '../utils/merchantRules';

export interface ParsedTransaction {
    amount: number;
    type: 'debit' | 'credit';
    merchant: string;
    category: string;
    timestamp: string;
    source: string;
}

/** Whitelisted packages for transaction notifications */
export const WHITELISTED_PACKAGES = [
    'com.google.android.apps.nbu.paisa.user', // Google Pay
    'com.phonepe.app',                         // PhonePe
    'net.one97.paytm',                         // Paytm
    'com.whatsapp',                             // WhatsApp Pay
    'in.amazon.mShop.android.shopping',         // Amazon Pay
    'com.sbi.SBIFreedomPlus',                   // SBI Yono
    'com.csam.icici.bank.imobile',              // ICICI iMobile
    'com.axis.mobile',                          // Axis Mobile
    'com.msf.kbank.mobile',                     // Kotak 811
    'com.hdfcbank.hdfcquickbank',               // HDFC Mobile
] as const;

/** Regex patterns for extracting transaction data */
const PATTERNS = {
    /** Matches amounts like ₹450, ₹1,299.50, Rs. 5000 */
    amount: /(?:₹|Rs\.?\s*|INR\s*)([0-9,]+(?:\.\d{1,2})?)/i,

    /** Matches debit/credit keywords */
    debit: /(?:debited|paid|sent|spent|charged|withdrawn|deducted)/i,
    credit: /(?:credited|received|refund|cashback|deposited)/i,

    /** Matches UPI transaction IDs */
    upiId: /([a-zA-Z0-9._-]+@[a-zA-Z]+)/,

    /** Extract merchant-like info from text */
    merchant: /(?:to|at|from|via)\s+([A-Za-z0-9\s&.'_-]+?)(?:\s*(?:on|for|via|ref|UPI|$))/i,
};

/** Merchant-to-category mapping */

/**
 * Parse a notification body to extract transaction data.
 * Returns null if the notification is not a financial transaction.
 */
export function parseNotification(
    packageName: string,
    title: string,
    body: string,
    timestamp: string
): ParsedTransaction | null {
    // Only process whitelisted apps
    if (!WHITELISTED_PACKAGES.includes(packageName as any)) {
        return null;
    }

    const fullText = `${title} ${body}`;

    // Extract amount
    const amountMatch = fullText.match(PATTERNS.amount);
    if (!amountMatch) return null;

    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) return null;

    // Determine type
    const isCredit = PATTERNS.credit.test(fullText);
    const isDebit = PATTERNS.debit.test(fullText);
    const type: 'debit' | 'credit' = isCredit && !isDebit ? 'credit' : 'debit';

    // Extract merchant
    const merchantMatch = fullText.match(PATTERNS.merchant);
    const merchant = merchantMatch
        ? merchantMatch[1].trim()
        : extractMerchantFallback(fullText);

    // Categorize
    const category = categorizeMerchant(merchant, fullText);

    return {
        amount,
        type,
        merchant: merchant || 'Unknown',
        category,
        timestamp,
        source: packageName,
    };
}

/** Fallback merchant extraction when regex fails */
function extractMerchantFallback(text: string): string {
    // Try to get something meaningful from the text
    const words = text.split(/\s+/).filter((w) => w.length > 2);
    return words.slice(0, 2).join(' ') || 'Unknown';
}

/** Categorize merchant based on keyword matching */
export function categorizeMerchant(
    merchant: string,
    fullText: string = ''
): string {
    // Longest match first, on word boundaries, against the table shared with
    // the clipboard parser. See utils/merchantRules.
    const match = matchMerchant(`${merchant} ${fullText}`);
    return match ? match.category : 'miscellaneous';
}
