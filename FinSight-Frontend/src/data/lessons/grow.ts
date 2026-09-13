/**
 * Track: Grow.
 *
 * Where saved money can sit and what each place does to it. Deliberately
 * boring: inflation, the instruments a salaried person actually uses, index
 * funds and SIPs, and the mistakes that cost more than fees do. No stock
 * picking, no trading, no live prices; the app's own removal of its mock
 * brokerage is documented in the README and this track stays on that side
 * of the line.
 */
import type { Track } from './schema';

export const GROW: Track = {
    id: 'grow',
    title: 'Grow',
    description: 'Inflation, FDs, PPF, index funds and the SIP habit',
    audience: 'Anyone with an emergency fund and a first surplus',
    lessons: [
        {
            id: 'gr_inflation',
            title: 'The quiet tax',
            summary: 'Why money in a savings account shrinks',
            minutes: 3,
            cards: [
                {
                    id: 'i1', type: 'info',
                    title: 'Six percent a year, forever',
                    body: 'Indian consumer inflation has averaged roughly 5 to 6 percent a year over the last two decades. A savings account pays 3 to 4. The gap is a tax on money that sits still, and it compounds the same way returns do.',
                    source: 'https://www.rbi.org.in/',
                },
                {
                    id: 'i2', type: 'explorable',
                    explorable: 'inflation',
                    prompt: 'Pick a goal amount and a year. See what it actually buys when you get there.',
                    question: {
                        prompt: 'At 6 percent inflation, 10 lakh in 12 years buys roughly what today?',
                        options: ['About 9 lakh', 'About 7 lakh', 'About 5 lakh', 'About 3 lakh'],
                        answer: 2,
                        explain: 'Just under 5 lakh. Prices double every twelve years at 6 percent, a handy rule: 72 divided by the rate gives the doubling time.',
                    },
                },
                {
                    id: 'i3', type: 'estimate',
                    prompt: 'The rule of 72: at 8 percent a year, how many years does money take to double?',
                    unit: 'months', min: 36, max: 240, step: 12,
                    answer: 108, tolerance: 0.12,
                    explain: 'About nine years (72 divided by 8), or 108 months. The same rule works for inflation: at 6 percent, prices double in twelve years.',
                },
                {
                    id: 'i4', type: 'trueFalse',
                    statement: 'A fixed deposit at 7 percent beats inflation at 6 percent.',
                    answer: false,
                    explain: 'Not after tax. FD interest is taxed at your slab rate, so 7 percent becomes about 5 percent for someone in the 30 percent slab, below inflation. FDs are for safety and known dates, not for growth.',
                },
            ],
        },
        {
            id: 'gr_places',
            title: 'Where money can sit',
            summary: 'FD, RD, liquid fund, PPF, NPS, index fund: what each is for',
            minutes: 4,
            cards: [
                {
                    id: 'w1', type: 'info',
                    title: 'Match the place to the date',
                    body: 'Every rupee you save has a date attached: next month, three years, retirement. The instrument should match the date. Money needed soon goes where it cannot fall; money needed in fifteen years goes where it can grow.',
                },
                {
                    id: 'w2', type: 'tapSort',
                    prompt: 'Sort by when you would use it',
                    buckets: ['Within 3 years', '10 years or more'],
                    items: [
                        { label: 'Liquid mutual fund', bucket: 0 },
                        { label: 'Fixed deposit', bucket: 0 },
                        { label: 'Equity index fund', bucket: 1 },
                        { label: 'PPF (15-year lock-in)', bucket: 1 },
                        { label: 'NPS (locked to 60)', bucket: 1 },
                        { label: 'Recurring deposit', bucket: 0 },
                    ],
                    explain: 'Liquid funds, FDs and RDs are for money with a near date. Equity needs a decade to smooth out its bad years. PPF and NPS lock the money anyway, so they only suit goals that far out.',
                },
                {
                    id: 'w3', type: 'choice',
                    prompt: 'PPF pays around 7 percent, tax-free, locked for 15 years. Who is it for?',
                    options: ['Anyone wanting quick access', 'Someone building a safe, tax-free base for a far-off goal', 'Traders', 'Nobody, the return is too low'],
                    answer: 1,
                    explain: 'PPF is government-backed, the interest is tax-free, and the 15-year lock is a feature for a retirement or house-down-payment base. It is the safe leg, not the whole portfolio.',
                },
                {
                    id: 'w4', type: 'choice',
                    prompt: 'What does an index fund do?',
                    options: ['Picks the best stocks each month', 'Holds every stock in an index like the Nifty 50, in proportion, for a very low fee', 'Guarantees 12 percent', 'Trades on news'],
                    answer: 1,
                    explain: 'It owns the market rather than trying to beat it, which most funds that try do not manage over long periods after fees. The expense ratio is typically 0.1 to 0.3 percent a year against 1 to 2 for actively managed funds.',
                },
                {
                    id: 'w5', type: 'spotTrap',
                    prompt: 'A fund factsheet. Tap the number that matters most over twenty years.',
                    lines: [
                        { label: 'Fund name', value: 'Nifty 50 Index Fund' },
                        { label: '1-year return', value: '14.2%' },
                        { label: 'Expense ratio', value: '0.20%' },
                        { label: 'Fund size', value: '12,000 Cr' },
                        { label: 'Star rating', value: '4 of 5' },
                    ],
                    trap: 2,
                    explain: 'The expense ratio is the only number on the sheet that is guaranteed to repeat every year. One-year returns and star ratings describe the past. A 1.5 percent difference in fees compounds to a third of the final sum over 25 years.',
                },
            ],
        },
        {
            id: 'gr_sip',
            title: 'The SIP habit',
            summary: 'Small, automatic, and raised every year',
            minutes: 3,
            cards: [
                {
                    id: 'p1', type: 'info',
                    title: 'The transfer you never see',
                    body: 'A SIP is a standing instruction: a fixed sum moves into a fund on a fixed date every month. It removes the two decisions that stop people investing, when and how much, and it buys more units when prices are low, fewer when high, without anyone choosing.',
                },
                {
                    id: 'p2', type: 'estimate',
                    prompt: '5,000 a month for 20 years at 12 percent a year. Roughly what does it grow to?',
                    unit: 'inr', min: 1200000, max: 8000000, step: 200000,
                    answer: 5000000, tolerance: 0.15,
                    explain: 'About 50 lakh, from 12 lakh actually invested. The other 38 lakh is compounding. Twelve percent is a long-run equity assumption, not a promise; at 10 percent it is about 38 lakh, still three times the money put in.',
                },
                {
                    id: 'p3', type: 'choice',
                    prompt: 'A step-up SIP raises the amount 10 percent every year. Starting at 5,000, roughly how much more does it end with over 20 years, versus flat?',
                    options: ['About the same', 'Around 50 percent more', 'Roughly double', 'Ten times'],
                    answer: 2,
                    explain: 'Close to double, because the raises land in the years the base is largest. Tie the step-up to your appraisal and the increase never feels like a cut.',
                },
                {
                    id: 'p4', type: 'trueFalse',
                    statement: 'Pausing a SIP when the market falls is the smart move.',
                    answer: false,
                    explain: 'A fall is when the same 5,000 buys the most units. Pausing then and resuming after the recovery is buying high and skipping low, the opposite of what the SIP was for.',
                },
                {
                    id: 'p5', type: 'orderSteps',
                    prompt: 'Starting a first SIP, in order',
                    steps: [
                        'Emergency fund in place',
                        'Complete KYC once, with PAN and Aadhaar',
                        'Pick a broad index fund with a low expense ratio',
                        'Set the SIP date two days after salary lands',
                        'Add a nominee and forget about it',
                    ],
                    explain: 'Emergency fund first, so a bad month never forces a sale at the wrong time. The date matters: money that has already left cannot be spent.',
                },
            ],
        },
        {
            id: 'gr_mistakes',
            title: 'The expensive mistakes',
            summary: 'Timing, tips, and the products sold hardest',
            minutes: 3,
            cards: [
                {
                    id: 'm1', type: 'info',
                    title: 'Most losses are behaviour',
                    body: 'Over long periods the average fund investor earns noticeably less than the funds they hold, because they buy after a rise and sell after a fall. The gap is not fees or bad funds. It is timing.',
                },
                {
                    id: 'm2', type: 'tapSort',
                    prompt: 'Sound plan or expensive mistake?',
                    buckets: ['Sound', 'Mistake'],
                    items: [
                        { label: 'Index fund SIP on salary day', bucket: 0 },
                        { label: 'Buying a stock from a Telegram tip', bucket: 1 },
                        { label: 'Options trading to "grow faster"', bucket: 1 },
                        { label: 'Raising the SIP after each hike', bucket: 0 },
                        { label: 'Switching funds after one bad year', bucket: 1 },
                        { label: 'Checking the portfolio once a quarter', bucket: 0 },
                    ],
                    explain: 'SEBI\'s own study found nine in ten retail options traders lose money. Tips and fund-hopping are the same mistake in different clothes: acting on the recent past.',
                },
                {
                    id: 'm3', type: 'choice',
                    prompt: 'A friend made 40 percent on a stock last year. What does that tell you about buying it now?',
                    options: ['It will do it again', 'Nothing about next year', 'It is safe because it is popular', 'You should buy more than them'],
                    answer: 1,
                    explain: 'Past returns are the most quoted and least useful number in investing. The 40 percent already happened, to someone else, at a different price.',
                },
                {
                    id: 'm4', type: 'trueFalse',
                    statement: 'You need to understand the stock market to invest in it.',
                    answer: false,
                    explain: 'You need to understand the instrument you hold. An index fund needs about one lesson\'s worth: it owns everything, cheaply, and you add to it monthly. Picking individual stocks needs far more, and most professionals who do it full-time still trail the index.',
                },
            ],
        },
    ],
};
