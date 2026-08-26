/**
 * Daily Money Question
 *
 * One question a day, fifteen seconds, no streak pressure. It exists so there
 * is a reason to open the app on a day the learner has no appetite for a full
 * module, and so knowledge gets refreshed rather than only ever acquired.
 *
 * The question is chosen deterministically from the date, so every learner
 * sees the same one on the same day and reopening the app cannot reroll it
 * into an easier one.
 */

export interface DailyQuestion {
    id: string;
    question: string;
    options: string[];
    answerIndex: number;
    /** Shown after answering, right or wrong. */
    explanation: string;
    topic: 'budgeting' | 'investing' | 'tax' | 'credit' | 'basics';
}

export const DAILY_QUESTIONS: DailyQuestion[] = [
    {
        id: 'dq1',
        question: 'You have ₹10,000 spare. Credit card bill of ₹8,000 at 40% a year, or invest it at 12%?',
        options: ['Invest it', 'Clear the card', 'Split it evenly', 'Keep it in savings'],
        answerIndex: 1,
        explanation: 'Clearing 40% debt is a guaranteed 40% return. No investment reliably beats that. Always kill high-interest debt first.',
        topic: 'credit',
    },
    {
        id: 'dq2',
        question: 'What does an expense ratio of 1.5% actually cost you on ₹1,00,000 invested?',
        options: ['₹150 a year', '₹1,500 a year', '₹15,000 a year', 'Nothing, it comes from profits'],
        answerIndex: 1,
        explanation: '1.5% of ₹1,00,000 is ₹1,500, charged yearly whether the fund gains or loses. Over decades this compounds into a serious drag.',
        topic: 'investing',
    },
    {
        id: 'dq3',
        question: 'Your emergency fund should sit in:',
        options: ['Equity mutual funds', 'A savings account or liquid fund', 'Fixed deposit locked for 5 years', 'Your friend who owes you'],
        answerIndex: 1,
        explanation: 'Emergency money must be reachable within a day or two without a loss. Growth is not the job here, availability is.',
        topic: 'basics',
    },
    {
        id: 'dq4',
        question: 'Under the 50/30/20 rule, which bucket does your Netflix subscription belong to?',
        options: ['Needs', 'Wants', 'Savings', 'Depends on how much you watch'],
        answerIndex: 1,
        explanation: 'Entertainment is a want. The test is simple: if cancelling it would not affect your health, housing, or ability to work, it is a want.',
        topic: 'budgeting',
    },
    {
        id: 'dq5',
        question: 'You sell shares 8 months after buying. Which tax applies?',
        options: ['Long-term capital gains', 'Short-term capital gains', 'No tax under a year', 'Income tax slab rate'],
        answerIndex: 1,
        explanation: 'Listed equity held under 12 months is short-term. Crossing the 12-month mark moves it to long-term, which is taxed more kindly.',
        topic: 'tax',
    },
    {
        id: 'dq6',
        question: 'What is the main advantage of a SIP over investing a lump sum?',
        options: ['Higher guaranteed returns', 'It averages your purchase price', 'No tax on gains', 'The fund manager tries harder'],
        answerIndex: 1,
        explanation: 'Investing a fixed amount regularly buys more units when prices fall and fewer when they rise, averaging your cost and removing the need to time the market.',
        topic: 'investing',
    },
    {
        id: 'dq7',
        question: 'Section 80C lets you claim up to how much a year?',
        options: ['₹50,000', '₹1,00,000', '₹1,50,000', '₹2,00,000'],
        answerIndex: 2,
        explanation: '₹1.5 lakh, covering ELSS, PPF, EPF, life insurance premiums and principal on a home loan, under the old tax regime.',
        topic: 'tax',
    },
    {
        id: 'dq8',
        question: 'Paying only the minimum due on a credit card means:',
        options: ['You avoid all interest', 'Interest accrues on the rest', 'Your credit score improves', 'The bank waives late fees'],
        answerIndex: 1,
        explanation: 'The minimum keeps you out of default but interest keeps running on the balance, often at 36 to 48% a year. It is the most expensive debt most people carry.',
        topic: 'credit',
    },
    {
        id: 'dq9',
        question: 'Inflation is 6% and your savings account pays 3%. What is happening to your money?',
        options: ['Growing slowly', 'Losing about 3% of its buying power a year', 'Keeping pace', 'Growing at 9%'],
        answerIndex: 1,
        explanation: 'Real return is roughly the interest minus inflation. At 3% against 6% inflation, the number in the account grows while what it can buy shrinks.',
        topic: 'basics',
    },
    {
        id: 'dq10',
        question: 'NAV of a mutual fund is ₹50 and you invest ₹5,000. How many units do you get?',
        options: ['50', '100', '500', '250'],
        answerIndex: 1,
        explanation: '₹5,000 divided by ₹50 is 100 units. A lower NAV does not make a fund cheaper or better, it just means more units for the same money.',
        topic: 'investing',
    },
    {
        id: 'dq11',
        question: 'Which of these most improves your credit score over time?',
        options: ['Never using a credit card', 'Paying bills in full and on time', 'Closing old accounts', 'Applying for many cards'],
        answerIndex: 1,
        explanation: 'Payment history is the largest single factor. Old accounts also help by lengthening your credit history, so closing them can hurt.',
        topic: 'credit',
    },
    {
        id: 'dq12',
        question: 'Roughly how much should an emergency fund cover?',
        options: ['One month of expenses', 'Three to six months of expenses', 'One year of income', 'Whatever is left over'],
        answerIndex: 1,
        explanation: 'Three to six months of essential expenses is the usual guidance. Aim higher if your income is irregular or you support others.',
        topic: 'basics',
    },
    {
        id: 'dq13',
        question: 'Diversification mainly protects you from:',
        options: ['Market crashes entirely', 'One company or sector failing', 'Inflation', 'Paying tax'],
        answerIndex: 1,
        explanation: 'Spreading money reduces the damage any single holding can do. It does not protect against the whole market falling, and nothing does.',
        topic: 'investing',
    },
    {
        id: 'dq14',
        question: 'You earn ₹40,000 a month. Under 50/30/20, what goes to savings?',
        options: ['₹4,000', '₹8,000', '₹12,000', '₹20,000'],
        answerIndex: 1,
        explanation: '20% of ₹40,000 is ₹8,000. The rule splits income, not spending: 50% needs, 30% wants, 20% savings and debt repayment.',
        topic: 'budgeting',
    },
    {
        id: 'dq15',
        question: 'A friend guarantees 30% returns a month on your money. This is:',
        options: ['A great opportunity', 'Almost certainly a scam', 'Normal for crypto', 'Worth a small try'],
        answerIndex: 1,
        explanation: 'Guaranteed high returns do not exist. 30% a month would turn ₹10,000 into over ₹2 crore in two years. Anyone promising this is lying or about to lose your money.',
        topic: 'basics',
    },
    {
        id: 'dq16',
        question: 'What happens to your EPF when you change jobs?',
        options: ['It is forfeited', 'You can transfer it to the new employer', 'It converts to salary', 'It must be withdrawn immediately'],
        answerIndex: 1,
        explanation: 'Your UAN stays the same across jobs and the balance transfers. Withdrawing instead resets your retirement savings and can trigger tax.',
        topic: 'tax',
    },
    {
        id: 'dq17',
        question: 'Buying something at 40% off that you did not plan to buy saves you:',
        options: ['40% of the price', 'Nothing, you spent money you were not going to spend', 'The full price', 'It depends on the item'],
        answerIndex: 1,
        explanation: 'A discount only saves money on a purchase you were already making. Sales are designed to convert browsing into spending.',
        topic: 'budgeting',
    },
    {
        id: 'dq18',
        question: 'Compound interest works best with:',
        options: ['A large starting amount', 'Time', 'A high risk appetite', 'Frequent trading'],
        answerIndex: 1,
        explanation: 'Time is the dominant variable. ₹5,000 a month from age 22 usually beats ₹15,000 a month from age 35, because the early money compounds for longer.',
        topic: 'investing',
    },
    {
        id: 'dq19',
        question: 'Which is generally the safest place for money you need next month?',
        options: ['Small-cap equity fund', 'Savings account', 'Cryptocurrency', 'Your cousin\'s startup'],
        answerIndex: 1,
        explanation: 'Money with a short deadline should not be exposed to market swings. A month is far too short a horizon for equity.',
        topic: 'basics',
    },
    {
        id: 'dq20',
        question: 'Your monthly subscriptions total ₹800. What is that a year?',
        options: ['₹4,800', '₹9,600', '₹8,000', '₹12,000'],
        answerIndex: 1,
        explanation: '₹800 times 12 is ₹9,600. Subscriptions feel small monthly and land hard annually, which is exactly why they go unreviewed.',
        topic: 'budgeting',
    },
    {
        id: 'dq21',
        question: 'What does an index fund do?',
        options: ['Picks the best stocks', 'Copies a market index like NIFTY 50', 'Guarantees returns', 'Invests only in bonds'],
        answerIndex: 1,
        explanation: 'It holds the same stocks in the same proportions as the index. No stock-picking means much lower fees, which is most of why they perform well.',
        topic: 'investing',
    },
    {
        id: 'dq22',
        question: 'Lifestyle inflation means:',
        options: ['Prices rising each year', 'Spending more as you earn more', 'Luxury goods getting costlier', 'Rent going up'],
        answerIndex: 1,
        explanation: 'It is why a raise often does not improve savings. If spending rises with income, you earn more and keep the same amount.',
        topic: 'budgeting',
    },
    {
        id: 'dq23',
        question: 'Term insurance differs from other life insurance because it:',
        options: ['Pays out on maturity', 'Is pure cover with no investment component', 'Doubles as a savings plan', 'Covers medical bills'],
        answerIndex: 1,
        explanation: 'Term plans pay only if you die during the term, which makes them far cheaper. Mixing insurance and investment usually gives you a poor version of both.',
        topic: 'basics',
    },
    {
        id: 'dq24',
        question: 'Rupee cost averaging protects you mainly from:',
        options: ['All losses', 'Bad timing', 'Tax', 'Inflation'],
        answerIndex: 1,
        explanation: 'Investing steadily means you never put everything in at the worst moment. It reduces the cost of bad timing; it does not eliminate loss.',
        topic: 'investing',
    },
];

/**
 * Pick the question for a given day.
 *
 * Hashes the date key so the choice is stable for that date, the same for
 * everyone, and unpredictable enough that consecutive days are not adjacent
 * in the pool.
 */
export function questionForDate(
    dateKey: string,
    pool: DailyQuestion[] = DAILY_QUESTIONS
): DailyQuestion {
    let hash = 5381;
    for (let i = 0; i < dateKey.length; i++) {
        hash = ((hash << 5) + hash + dateKey.charCodeAt(i)) >>> 0;
    }
    return pool[hash % pool.length];
}
