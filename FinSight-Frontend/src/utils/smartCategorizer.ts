/**
 * Clipboard parser for bank SMS.
 *
 * Keyword rules moved to utils/merchantRules, which both this and the
 * notification parser now share. They previously kept separate tables that
 * disagreed with each other, so the same transaction could be categorised
 * differently depending on whether it arrived by paste or by notification.
 */
import { matchMerchant } from './merchantRules';

export const parseBankSMS = (smsText: string) => {
    const lowerText = smsText.toLowerCase();
    
    // 1. Extract the Amount using Regex
    // Looks for "Rs.", "INR", or "₹" followed by numbers
    const amountMatch = smsText.match(/(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

    // 2. Identify the Category based on keywords
    let detectedCategory = 'other';
    let detectedMerchant = 'Unknown Merchant';

    // Longest match first, on word boundaries. See utils/merchantRules for why
    // both of those matter more than they look.
    const match = matchMerchant(lowerText);
    if (match) {
        detectedCategory = match.category;
        // Capitalize the first letter for a clean merchant name
        detectedMerchant = match.keyword.charAt(0).toUpperCase() + match.keyword.slice(1);
    }

    // 3. Determine if it's a debit or credit
    const isCredit = lowerText.includes('credited') || lowerText.includes('received');
    const type = isCredit ? 'credit' : 'debit';

    return {
        amount,
        category: detectedCategory,
        merchant: detectedMerchant,
        type,
        date: new Date().toISOString(),
    };
};