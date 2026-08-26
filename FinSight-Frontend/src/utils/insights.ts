import { EITMCardData } from '../data/courseContent';
import { FirestoreTransaction, FirestoreBudget } from '../services/firestoreService';

/**
 * Generates dynamic EITM (Everything Important To Me) cards based on real user data.
 */
export const generateInsights = (
    transactions: FirestoreTransaction[],
    budgets: FirestoreBudget[]
): EITMCardData[] => {
    const cards: EITMCardData[] = [];

    // 1. Analyze Spending per Category
    const categoryTotals: Record<string, number> = {};
    let totalSpent = 0;

    transactions.forEach((t) => {
        if (t.type === 'debit') {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
            totalSpent += t.amount;
        }
    });

    // Find top spending category
    let topCategory = '';
    let maxSpend = 0;
    Object.entries(categoryTotals).forEach(([cat, amount]) => {
        if (amount > maxSpend) {
            maxSpend = amount;
            topCategory = cat;
        }
    });

    // 2. Budget Alerts (if budgets exist)
    budgets.forEach((budget) => {
        const spent = categoryTotals[budget.category.toLowerCase()] || 0;
        const percentage = (spent / budget.monthlyLimit) * 100;

        if (percentage >= 80) {
            cards.push({
                id: `alert_${budget.category}`,
                trigger: 'transaction_spike',
                headline: `${budget.category} Budget Alert`,
                explanation: `You've used ${Math.round(percentage)}% of your ${budget.category} budget (₹${spent} / ₹${budget.monthlyLimit}). Slow down!`,
                personalImpact: {
                    holding: `${budget.category} Budget`,
                    change: `₹${budget.monthlyLimit - spent} left`,
                },
                learnMoreLink: '/learning/budgeting',
            });
        }
    });

    // 3. High Spending Alert (Generic if no budget alert triggered)
    if (cards.length === 0 && maxSpend > 0) {
        cards.push({
            id: 'insight_top_spend',
            trigger: 'transaction_spike',
            headline: `Spending Check: ${topCategory.charAt(0).toUpperCase() + topCategory.slice(1)}`,
            explanation: `Your highest spending category is ${topCategory} (₹${maxSpend}). This accounts for ${Math.round((maxSpend / totalSpent) * 100)}% of your total debit transactions.`,
            personalImpact: {
                holding: 'Wallet Impact',
                change: `-₹${maxSpend}`,
            },
            learnMoreLink: '/learning/spending-habits',
        });
    }

    // 4. Fallback: "Good Job" if spending is low (and no alerts)
    if (cards.length === 0 && totalSpent > 0) {
        cards.push({
            id: 'insight_good_job',
            trigger: 'policy', // Using policy icon for generic 'good'
            headline: 'Spending Looks Controlled',
            explanation: `You've spent ₹${totalSpent} so far. Keep tracking every expense to stay on top of your finances!`,
            personalImpact: {
                holding: 'Total Spent',
                change: `₹${totalSpent}`,
            },
            learnMoreLink: '/learning/saving-tips',
        });
    }

    // 5. Add a generic Market Insight (Always useful)
    // In a real app, this would come from an API based on user's portfolio
    cards.push({
        id: 'market_nifty',
        trigger: 'market_event',
        headline: 'Market Update: NIFTY 50',
        explanation: 'Markets are showing volatility. NIFTY 50 is currently at 22,145. Good time to review your SIPs?',
        personalImpact: {
            holding: 'Market Trend',
            change: '+0.85%',
        },
        learnMoreLink: '/learning/investing-101',
    });

    return cards;
};
