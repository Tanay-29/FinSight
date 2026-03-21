// Define our keyword rules
const CATEGORY_RULES = {
    dining: ['zomato', 'swiggy', 'mcdonalds', 'starbucks', 'cafe', 'restaurant', 'kfc', 'dominos'],
    transport: ['irctc', 'uber', 'ola', 'rapido', 'makemytrip', 'indigo', 'metro', 'petrol', 'hpcl', 'bpcl'],
    shopping: ['amazon', 'flipkart', 'myntra', 'zara', 'h&m', 'reliance', 'd-mart'],
    groceries: ['blinkit', 'zepto', 'swiggy instamart', 'bigbasket', 'milk', 'grocery'],
    utilities: ['bescom', 'electricity', 'jio', 'airtel', 'vi', 'broadband', 'gas'],
    entertainment: ['netflix', 'spotify', 'bookmyshow', 'pvr', 'prime video'],
};

export const parseBankSMS = (smsText: string) => {
    const lowerText = smsText.toLowerCase();
    
    // 1. Extract the Amount using Regex
    // Looks for "Rs.", "INR", or "₹" followed by numbers
    const amountMatch = smsText.match(/(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

    // 2. Identify the Category based on keywords
    let detectedCategory = 'other';
    let detectedMerchant = 'Unknown Merchant';

    for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
        const foundKeyword = keywords.find(keyword => lowerText.includes(keyword));
        if (foundKeyword) {
            detectedCategory = category;
            // Capitalize the first letter for a clean merchant name
            detectedMerchant = foundKeyword.charAt(0).toUpperCase() + foundKeyword.slice(1);
            break;
        }
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