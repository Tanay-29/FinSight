/**
 * The money knowledge check: ten questions, taken once at the start and again
 * a few weeks later, so the app can show what changed.
 *
 * The first three are the classic "Big Three" financial literacy questions
 * (compounding, inflation, diversification) that most literacy surveys use,
 * reworded for rupees. The rest cover what young people in India actually
 * run into: the credit card minimum due, UPI scams, the emergency fund, SIPs,
 * the credit score, a fake bank call, and risk against return.
 *
 * Each answer carries a one-line explanation, shown only on the results
 * screen. During the check nothing says right or wrong, because it is a
 * measurement, not a lesson.
 */
export interface QuizQuestion {
    id: string;
    prompt: string;
    options: string[];
    answer: number;
    explain: string;
}

export const MONEY_QUIZ: QuizQuestion[] = [
    {
        id: 'compound',
        prompt: 'You put ₹1,000 in an account paying 10% a year and leave the interest in. After two years you have:',
        options: ['₹1,200', '₹1,210', '₹1,100', '₹1,020'],
        answer: 1,
        explain: 'Year one earns ₹100. Year two earns 10% of ₹1,100, which is ₹110. Interest earning interest is compounding.',
    },
    {
        id: 'inflation',
        prompt: 'Your savings account pays 3% a year and prices rise 6% a year. After a year, your money buys:',
        options: ['More than today', 'The same as today', 'Less than today', 'It depends on the bank'],
        answer: 2,
        explain: 'Your balance grew 3% but prices grew 6%, so each rupee buys less. That gap is why money left idle loses value.',
    },
    {
        id: 'diversify',
        prompt: 'Which is usually less risky?',
        options: ['Shares of one company', 'A fund holding shares of many companies', 'They carry the same risk', 'Whichever did better last year'],
        answer: 1,
        explain: 'If one company does badly, a fund holding many barely notices. Spreading money out lowers the risk of a big loss.',
    },
    {
        id: 'minimumDue',
        prompt: 'Your credit card bill is ₹20,000 and the minimum due is ₹1,000. If you pay only ₹1,000:',
        options: ['No interest is charged', 'Interest is charged on the unpaid amount, at a high rate', 'The card gets blocked', 'The rest is forgiven'],
        answer: 1,
        explain: 'Paying the minimum only avoids the late fee. Interest, often around 40% a year, runs on everything you did not pay.',
    },
    {
        id: 'upiPin',
        prompt: 'To receive money on UPI, you need to:',
        options: ['Enter your UPI PIN', 'Do nothing, the PIN is only for paying', 'Share an OTP', 'Scan the sender\'s QR code'],
        answer: 1,
        explain: 'You only enter your PIN to send money. Anyone asking for it so you can "receive" is running a scam.',
    },
    {
        id: 'emergency',
        prompt: 'A common rule for an emergency fund is:',
        options: ['One week of expenses', 'Three to six months of expenses', 'Two years of income', 'None, a credit card is enough'],
        answer: 1,
        explain: 'Three to six months of expenses covers a job loss or a hospital bill without borrowing or selling investments at a bad time.',
    },
    {
        id: 'sip',
        prompt: 'A SIP is:',
        options: ['A type of bank account', 'A fixed amount put into a mutual fund at regular intervals', 'A government savings bond', 'A loan against your salary'],
        answer: 1,
        explain: 'A Systematic Investment Plan puts the same amount in every month, buying more units when prices are low and fewer when high.',
    },
    {
        id: 'cibil',
        prompt: 'What affects your credit score the most?',
        options: ['How much you earn', 'Paying EMIs and card bills on time', 'How many bank accounts you have', 'Where you live'],
        answer: 1,
        explain: 'Repayment history matters most. Your income is not part of the score at all.',
    },
    {
        id: 'scamCall',
        prompt: 'A caller says they are from your bank and needs an OTP to stop your account being blocked. You should:',
        options: ['Give the OTP quickly', 'Hang up and call the number on the back of your card', 'Share it only if they know your name', 'Send it by SMS instead'],
        answer: 1,
        explain: 'Banks never ask for an OTP. Hang up and call the bank yourself on a number you already trust.',
    },
    {
        id: 'riskReturn',
        prompt: 'Over ten years or more, which has usually grown the most, with the biggest ups and downs along the way?',
        options: ['A fixed deposit', 'An equity (stock) mutual fund', 'A savings account', 'Cash kept at home'],
        answer: 1,
        explain: 'Over long periods equity has usually beaten deposits, but it can fall sharply in any single year. That is the trade.',
    },
];

/** How long after the first check the second one is offered. */
export const QUIZ_RETAKE_AFTER_DAYS = 21;
