/**
 * Track: First Credit.
 *
 * Cards, the minimum-due trap, CIBIL, and the loans that do not call
 * themselves loans. Figures agree with utils/moneyMath.ts at the default
 * 42 percent APR and 5 percent minimum due from data/taxConstants.ts.
 */
import type { Track } from './schema';

export const FIRST_CREDIT: Track = {
    id: 'firstCredit',
    title: 'First Credit',
    description: 'Cards, the minimum-due trap, CIBIL and BNPL',
    audience: 'Anyone with a first card, or an EMI offer on their screen',
    lessons: [
        {
            id: 'fc_card',
            title: 'How a card actually works',
            summary: 'The billing cycle, the grace period, and the one rule that keeps it free',
            minutes: 4,
            cards: [
                {
                    id: 'k1', type: 'info',
                    title: 'A month of spending, one bill',
                    body: 'A credit card collects everything you spend in a billing cycle of about 30 days into one statement. You then get roughly 20 more days to pay it. Pay the full statement amount by the due date and you pay no interest at all. That is the whole trick.',
                },
                {
                    id: 'k2', type: 'orderSteps',
                    prompt: 'Put the cycle in order',
                    steps: [
                        'You spend on the card during the cycle',
                        'The statement is generated on the billing date',
                        'The due date arrives about 20 days later',
                        'You pay the total amount due',
                        'The next cycle starts with a clean slate',
                    ],
                    explain: 'Spending, statement, due date, payment. The gap between a purchase and its due date can be up to 45 to 50 days, which is where the "interest-free period" comes from.',
                },
                {
                    id: 'k3', type: 'trueFalse',
                    statement: 'If you pay the total due by the due date, you pay no interest on that statement.',
                    answer: true,
                    explain: 'Correct. Interest is only charged when a balance is carried past the due date. Paying in full every month makes the card a free 30 to 50 day loan, plus whatever rewards it gives.',
                },
                {
                    id: 'k4', type: 'choice',
                    prompt: 'You paid 90 percent of the statement on time and carried 2,000. What is interest charged on?',
                    options: ['Only the 2,000 you carried', 'Nothing, since you paid most of it', 'The full statement amount, from each purchase date', 'The next statement only'],
                    answer: 2,
                    explain: 'This is the part nobody explains. Once any balance is carried, most issuers withdraw the interest-free period on the entire statement, so interest runs from the date of each purchase, not just on the 2,000. Paying 90 percent is not 90 percent as good as paying in full.',
                },
                {
                    id: 'k5', type: 'choice',
                    prompt: 'The safest way to never miss a due date is',
                    options: ['Set a reminder on your phone', 'Auto-debit of the total amount due from your bank account', 'Auto-debit of the minimum due', 'Pay whenever the SMS arrives'],
                    answer: 1,
                    explain: 'Auto-pay the total, not the minimum. Auto-paying the minimum keeps the card "active" while the balance grows. Keep enough in the linked account a few days before the date.',
                },
            ],
        },
        {
            id: 'fc_mindue',
            title: 'The minimum-due trap',
            summary: 'What paying the minimum really costs, in months and rupees',
            minutes: 4,
            cards: [
                {
                    id: 'm1', type: 'info',
                    title: 'The most expensive line on the statement',
                    body: 'Every statement shows a minimum amount due, usually 5 percent of the balance. Paying it keeps the account in good standing. It also keeps 95 percent of the balance rolling at 36 to 48 percent a year. It is designed to look like a payment plan. It is not one.',
                    stat: { value: '36 to 48%', label: 'annual interest on carried balances, typical of Indian cards' },
                },
                {
                    id: 'm2', type: 'estimate',
                    prompt: 'You owe 50,000 and pay only the minimum each month at 42 percent. How long until it is cleared?',
                    unit: 'months', min: 6, max: 240, step: 6,
                    answer: 185, tolerance: 0.2,
                    explain: 'About 185 months. Over 15 years, and you pay around 99,000 in interest on a 50,000 balance. The minimum shrinks as the balance shrinks, so the payments get smaller but never stop.',
                },
                {
                    id: 'm3', type: 'explorable',
                    explorable: 'minimumDue',
                    prompt: 'Drag the monthly payment and watch the payoff time and interest. Find the point where it never clears.',
                    question: {
                        prompt: 'On 50,000 at 42 percent, a 1,500 a month payment',
                        options: ['Clears it in about 3 years', 'Clears it in about 5 years', 'Never clears it', 'Clears it in a year'],
                        answer: 2,
                        explain: 'Never. The interest alone is 1,750 in the first month, so 1,500 does not even cover it and the balance grows. Any payment below the monthly interest is a treadmill.',
                    },
                },
                {
                    id: 'm4', type: 'spotTrap',
                    prompt: 'This is a statement summary. Tap the line that will cost you the most if you act on it.',
                    lines: [
                        { label: 'Total amount due', value: '18,450' },
                        { label: 'Minimum amount due', value: '922' },
                        { label: 'Payment due date', value: '18 Oct' },
                        { label: 'Available credit limit', value: '81,550' },
                        { label: 'Reward points earned', value: '540' },
                    ],
                    trap: 1,
                    explain: 'Paying 922 leaves 17,528 carrying interest at around 3.5 percent a month, and withdraws the interest-free period on new purchases too. The only number to act on is the total amount due.',
                },
                {
                    id: 'm5', type: 'choice',
                    prompt: 'You genuinely cannot pay the full 18,450 this month. What is the least bad option?',
                    options: ['Pay the minimum and hope next month is better', 'Pay as much as you can above the minimum and stop using the card until it is clear', 'Take a cash advance from another card', 'Ignore it until you can pay in full'],
                    answer: 1,
                    explain: 'Every rupee above the minimum goes straight to principal. Stopping new spending matters as much, because new purchases also lose the grace period. A cash advance charges interest from day one plus a fee, and ignoring it adds late fees and a CIBIL mark.',
                },
            ],
        },
        {
            id: 'fc_cibil',
            title: 'CIBIL, the number that follows you',
            summary: 'What moves a credit score and what people get wrong about it',
            minutes: 4,
            cards: [
                {
                    id: 's1', type: 'info',
                    title: '300 to 900',
                    body: 'Four bureaus track every loan and card in your name; CIBIL is the one lenders mention most. Scores run from 300 to 900 and lenders like to see 750 or above. A new borrower starts with no score, and the first year builds it.',
                    stat: { value: '41%', label: 'of new-to-credit borrowers in India are Gen Z, per TransUnion CIBIL' },
                    source: 'https://www.transunioncibil.com/',
                },
                {
                    id: 's2', type: 'tapSort',
                    prompt: 'Does each of these help or hurt your score?',
                    buckets: ['Helps', 'Hurts'],
                    items: [
                        { label: 'Paying the full bill on time every month', bucket: 0 },
                        { label: 'Using under 30 percent of your limit', bucket: 0 },
                        { label: 'Applying for three cards in one month', bucket: 1 },
                        { label: 'Closing your oldest card', bucket: 1 },
                        { label: 'Keeping an old card open with small use', bucket: 0 },
                        { label: 'Missing one BNPL instalment', bucket: 1 },
                    ],
                    explain: 'Payment history and utilisation are the big two. Closing the oldest card shortens your credit age, and each application is a hard enquiry. BNPL counts because it is reported as a loan.',
                },
                {
                    id: 's3', type: 'choice',
                    prompt: 'Your limit is 1 lakh. Which monthly usage looks best to a lender?',
                    options: ['Around 25,000', 'Around 60,000', 'The full 1 lakh, paid in full', 'Zero, never used'],
                    answer: 0,
                    explain: 'Utilisation under about 30 percent reads as comfortable. Maxing out reads as stretched even if you pay in full, because the statement balance is what gets reported. Never using it builds no history at all.',
                },
                {
                    id: 's3x', type: 'explorable',
                    explorable: 'cibil',
                    prompt: 'Move each slider and watch which one the needle cares about most.',
                    question: {
                        prompt: 'Which single change knocks the most off a score?',
                        options: ['Using 60% of your limit', 'Missing a few payments in two years', 'Having a one-year-old account', 'Two applications in six months'],
                        answer: 1,
                        explain: 'Payment history is the heaviest factor everywhere. Utilisation is second and recovers the month you pay down; a missed payment stays on the file for years.',
                    },
                },
                {
                    id: 's4', type: 'trueFalse',
                    statement: 'Checking your own credit score lowers it.',
                    answer: false,
                    explain: 'Your own check is a soft enquiry and does not touch the score. A lender pulling it for an application is a hard enquiry, and many of those in a short time do. You can check for free once a year on each bureau.',
                },
                {
                    id: 's5', type: 'choice',
                    prompt: 'A loan you never took shows up on your report. First step?',
                    options: ['Ignore it, it will drop off', 'Raise a dispute with the bureau and the lender, in writing', 'Pay it to clear the record', 'Apply for a new card to dilute it'],
                    answer: 1,
                    explain: 'Every bureau has an online dispute process and must respond within 30 days. Never pay a debt that is not yours to "clean" a report; that confirms it.',
                },
            ],
        },
        {
            id: 'fc_bnpl',
            title: 'No-cost EMI and BNPL',
            summary: 'The loans that do not call themselves loans',
            minutes: 4,
            cards: [
                {
                    id: 'b1', type: 'info',
                    title: 'A loan by any other name',
                    body: 'Buy now pay later, pay-in-3, credit on UPI, no-cost EMI: all of these are loans. Each one is reported to the bureaus, usually as a small-ticket personal loan, and each missed instalment is a missed loan payment on your record.',
                },
                {
                    id: 'b2', type: 'tapSort',
                    prompt: 'Which of these are loans?',
                    buckets: ['A loan', 'Not a loan'],
                    items: [
                        { label: 'No-cost EMI on a phone', bucket: 0 },
                        { label: 'UPI paid from your savings account', bucket: 1 },
                        { label: 'BNPL pay-in-3 at checkout', bucket: 0 },
                        { label: 'Credit line linked to UPI', bucket: 0 },
                        { label: 'Debit card purchase', bucket: 1 },
                        { label: 'Credit card bill paid in full', bucket: 0 },
                    ],
                    explain: 'Even a credit card bill paid in full was a loan for those weeks; it just cost nothing. The others are loans with interest, fees or both, whatever the checkout button says.',
                },
                {
                    id: 'b3', type: 'estimate',
                    prompt: 'A 30,000 phone on 6-month no-cost EMI, with a 199 processing fee and a 1,500 cash discount you gave up. Roughly how much extra does it cost over paying cash?',
                    unit: 'inr', min: 0, max: 5000, step: 250,
                    answer: 2000, tolerance: 0.3,
                    explain: 'Close to 2,000. The lender still charges interest of about 1,300; the seller rebates it as a discount, but you pay GST on that interest and on the fee, about 275, plus the 199 fee, plus the 1,500 cash discount you did not get. "No-cost" means no interest line on the statement, not no cost.',
                },
                {
                    id: 'b4', type: 'choice',
                    prompt: 'Why does GST show up on a no-cost EMI?',
                    options: ['GST applies to all phone sales', 'The bank still charges interest, and GST is charged on interest and fees', 'It is a mistake you can dispute', 'Only on EMIs longer than 12 months'],
                    answer: 1,
                    explain: 'The interest is real; the merchant funds an equal discount so it nets to zero on the price. GST at 18 percent is levied on the interest and processing fee, and that part is not rebated.',
                },
                {
                    id: 'b4x', type: 'explorable',
                    explorable: 'noCostEmi',
                    prompt: 'Set the price and tenure. Slide the cash discount to zero and see what is left of the "cost".',
                    question: {
                        prompt: 'With no cash discount on offer, what does a no-cost EMI still cost you?',
                        options: ['Nothing at all', 'The processing fee and GST on the hidden interest', 'The full interest', 'Only the GST'],
                        answer: 1,
                        explain: 'The interest is rebated, but the fee and the GST on interest and fee are not. A few hundred rupees, not free, and a loan on your file either way.',
                    },
                },
                {
                    id: 'b5', type: 'trueFalse',
                    statement: 'Missing one BNPL instalment of 800 can affect a home loan application years later.',
                    answer: true,
                    explain: 'It is reported as a missed payment on a personal loan, and payment history is the heaviest factor in the score. Lenders see the history, not the size. Small loans are tracked exactly like large ones.',
                },
                {
                    id: 'b6', type: 'choice',
                    prompt: 'Three EMIs and two BNPL plans add up to 55 percent of your salary. What is the rule you have crossed?',
                    options: ['There is no rule, as long as you pay them', 'Total EMIs should stay under about 30 to 40 percent of income', 'EMIs should never exceed 10 percent', 'Only home loans count'],
                    answer: 1,
                    explain: 'Lenders themselves use a 40 to 50 percent debt-to-income ceiling, and a comfortable personal limit is lower. Above it, one bad month means a missed instalment, and the record starts.',
                },
            ],
        },
    ],
};
