/**
 * Track: Protect.
 *
 * The things that stop one bad month from undoing a good year: an emergency
 * fund, health cover that is actually yours, term insurance instead of the
 * plan the agent brought, a nominee on every account, and the scams that
 * take more money from people under thirty than any bad investment does.
 */
import type { Track } from './schema';

export const PROTECT: Track = {
    id: 'protect',
    title: 'Protect',
    description: 'Emergency fund, insurance that is insurance, and scams',
    audience: 'Anyone who has started saving and wants to keep it',
    lessons: [
        {
            id: 'pr_emergency',
            title: 'The emergency fund',
            summary: 'How much, where it sits, and what counts as an emergency',
            minutes: 3,
            cards: [
                {
                    id: 'e1', type: 'info',
                    title: 'Before anything else',
                    body: 'An emergency fund is three to six months of essential spending, kept somewhere boring and instant. It is not an investment. Its job is to make sure a job loss, a hospital bill or a broken laptop never becomes a loan at 36 percent.',
                },
                {
                    id: 'e2', type: 'estimate',
                    prompt: 'Essential spending is 25,000 a month: rent, food, transport, phone. What is a three-month emergency fund?',
                    unit: 'inr', min: 25000, max: 200000, step: 5000,
                    answer: 75000, tolerance: 0.01,
                    explain: 'Three months of essentials is 75,000. Not three months of salary, and not three months of everything: subscriptions and eating out are the first things to stop in a real emergency.',
                },
                {
                    id: 'e2x', type: 'explorable',
                    explorable: 'runway',
                    prompt: 'This uses your own logged essentials. Slide the amount set aside and see how many months it covers.',
                },
                {
                    id: 'e3', type: 'tapSort',
                    prompt: 'Where does an emergency fund belong?',
                    buckets: ['Yes', 'No'],
                    items: [
                        { label: 'Savings account with a sweep-in FD', bucket: 0 },
                        { label: 'Liquid mutual fund', bucket: 0 },
                        { label: 'Equity index fund', bucket: 1 },
                        { label: 'Five-year tax-saver FD', bucket: 1 },
                        { label: 'Digital gold', bucket: 1 },
                    ],
                    explain: 'The test is: can I have it in my bank account tomorrow morning without losing money? Savings accounts and liquid funds pass. Equity can be down 20 percent on the day you need it; a tax-saver FD is locked for five years.',
                },
                {
                    id: 'e4', type: 'choice',
                    prompt: 'Which of these is an emergency-fund withdrawal?',
                    options: ['A concert ticket that sells out tonight', 'A friend\'s destination wedding', 'A 40,000 dental bill', 'A flash sale on a phone'],
                    answer: 2,
                    explain: 'Unexpected, necessary, and urgent: all three. The others are wants with a deadline attached, which is exactly how a fund gets quietly spent.',
                },
                {
                    id: 'e5', type: 'trueFalse',
                    statement: 'A credit card limit can serve as your emergency fund.',
                    answer: false,
                    explain: 'A card turns an emergency into a debt at 3 to 4 percent a month. It is a bridge for the week before your salary arrives, not a fund. If the emergency is losing your job, the limit can be cut too.',
                },
            ],
        },
        {
            id: 'pr_health',
            title: 'Health cover that is yours',
            summary: 'Why the office policy is not enough, and what to buy',
            minutes: 4,
            cards: [
                {
                    id: 'h1', type: 'info',
                    title: 'The policy you do not own',
                    body: 'Employer health cover is real and worth using. It also ends the day you leave, usually covers only you, and is often 2 to 3 lakh. A private hospital stay in a metro can cross that in four days.',
                },
                {
                    id: 'h2', type: 'choice',
                    prompt: 'You are 24, healthy, and your employer covers 3 lakh. What is the strongest reason to buy your own policy now?',
                    options: ['Premiums are cheapest at your age, and waiting periods start ticking', 'Employer cover does not pay for medicines', 'Tax deduction under 80D', 'The agent gets a bonus'],
                    answer: 0,
                    explain: 'Buying young locks in a low premium and starts the waiting periods for pre-existing conditions, which are usually two to four years. The 80D deduction is real but only under the old regime, and it is not the reason.',
                },
                {
                    id: 'h3', type: 'spotTrap',
                    prompt: 'A policy brochure. Tap the line that should make you read the fine print.',
                    lines: [
                        { label: 'Sum insured', value: '10 lakh' },
                        { label: 'Room rent limit', value: '1% of sum insured per day' },
                        { label: 'Pre-existing waiting period', value: '3 years' },
                        { label: 'Cashless hospitals', value: '9,000+' },
                        { label: 'No-claim bonus', value: '50% per year' },
                    ],
                    trap: 1,
                    explain: 'A room-rent cap of 1 percent is 10,000 a day. Pick a 15,000 room and most insurers scale down the entire claim, not just the room, in proportion. Look for policies with no room-rent limit; the premium difference is small.',
                },
                {
                    id: 'h4', type: 'trueFalse',
                    statement: 'A family floater for your parents is usually cheaper than two individual policies.',
                    answer: true,
                    explain: 'One sum insured shared across the family costs less than separate covers. The catch is that the premium is set by the oldest member, so it is best to keep parents on their own floater rather than on yours.',
                },
                {
                    id: 'h5', type: 'orderSteps',
                    prompt: 'A cashless claim, in order',
                    steps: [
                        'Check the hospital is in the insurer\'s network',
                        'Show the health card at the admission desk',
                        'Hospital sends a pre-authorisation request to the insurer',
                        'Insurer approves an amount, usually within hours',
                        'Pay only the non-covered items at discharge',
                    ],
                    explain: 'The network check comes first because a non-network hospital means paying everything and claiming it back later. Everything after that is paperwork between the hospital and the insurer.',
                },
            ],
        },
        {
            id: 'pr_term',
            title: 'Insurance is not an investment',
            summary: 'Term cover, and why the agent never leads with it',
            minutes: 4,
            cards: [
                {
                    id: 't1', type: 'info',
                    title: 'One job',
                    body: 'Life insurance has one purpose: replace your income for the people who depend on it if you die. A term plan does exactly that, cheaply. Endowment plans and ULIPs bundle a small cover with a weak investment and charge for both.',
                    stat: { value: 'Around 1 crore', label: 'of term cover for a healthy 25-year-old costs roughly 8,000 to 12,000 a year' },
                },
                {
                    id: 't2', type: 'choice',
                    prompt: 'You are 25, single, no dependants, no loans. Do you need life insurance?',
                    options: ['Yes, everyone does', 'Not yet, nobody depends on your income', 'Yes, for the tax saving', 'Only if you have a car'],
                    answer: 1,
                    explain: 'Life cover protects dependants. With none, the premium protects no one. Buy it the year someone depends on you, or the year you take a loan a family member would inherit.',
                },
                {
                    id: 't3', type: 'tapSort',
                    prompt: 'Insurance or investment?',
                    buckets: ['Insurance', 'Investment'],
                    items: [
                        { label: 'Term plan', bucket: 0 },
                        { label: 'Index fund SIP', bucket: 1 },
                        { label: 'ULIP', bucket: 1 },
                        { label: 'Health cover', bucket: 0 },
                        { label: 'Endowment "money back" plan', bucket: 1 },
                        { label: 'PPF', bucket: 1 },
                    ],
                    explain: 'ULIPs and endowment plans are investments with a thin insurance wrapper, and usually worse at both jobs than a term plan plus an index fund bought separately. Keep the two apart and each gets cheaper.',
                },
                {
                    id: 't4', type: 'trueFalse',
                    statement: 'A term plan pays nothing if you survive the term, so it is money wasted.',
                    answer: false,
                    explain: 'That is the point, and the reason it is cheap. Health insurance pays nothing if you stay healthy too. The premium buys the years of protection, and the difference in cost versus an endowment plan, invested, is worth far more than any maturity payout.',
                },
                {
                    id: 't5', type: 'choice',
                    prompt: 'An agent says "this plan gives you 5 lakh cover and returns 12 lakh at maturity". What is the question to ask?',
                    options: ['What is the annual return, after all charges, compared to a term plan plus an index fund?', 'Is the company reputed?', 'Can I pay monthly?', 'Is there a tax benefit?'],
                    answer: 0,
                    explain: 'Once you separate the two jobs, the comparison is simple: what does 5 lakh of term cover cost, and what does the rest of the premium earn in a plain fund? Bundled plans rarely survive that question.',
                },
            ],
        },
        {
            id: 'pr_scams',
            title: 'Scam week',
            summary: 'Five messages, five tells. Tap the one that gives it away',
            minutes: 4,
            cards: [
                {
                    id: 's1', type: 'info',
                    title: 'Nobody who is real asks for the OTP',
                    body: 'Every scam below is running right now, and people under thirty lose more to them than to any bad investment. The pattern is always the same: urgency, authority, and a request that no real bank, employer or courier would ever make.',
                },
                {
                    id: 's2', type: 'spotTrap',
                    prompt: 'A call from "your bank". Tap the line that proves it is not.',
                    lines: [
                        { label: 'Caller', value: 'Bank fraud department' },
                        { label: 'Claim', value: 'Suspicious transaction on your card' },
                        { label: 'Action', value: 'Share the OTP we just sent to block it' },
                        { label: 'Tone', value: 'Urgent, do it in 2 minutes' },
                    ],
                    trap: 2,
                    explain: 'An OTP authorises a transaction; it never blocks one. A bank can freeze a card from its side without you. Hang up and call the number on the back of the card.',
                },
                {
                    id: 's3', type: 'spotTrap',
                    prompt: 'A refund for a failed order. Tap the tell.',
                    lines: [
                        { label: 'From', value: 'Customer support' },
                        { label: 'Message', value: 'Your refund of 1,299 is ready' },
                        { label: 'Action', value: 'Accept this UPI collect request to receive it' },
                        { label: 'Link', value: 'Tracking page' },
                    ],
                    trap: 2,
                    explain: 'A UPI collect request takes money out of your account when you approve it. Money coming in never needs your PIN or your approval. Any "receive money by entering your PIN" is a payment.',
                },
                {
                    id: 's4', type: 'spotTrap',
                    prompt: 'A job offer on WhatsApp. Tap the tell.',
                    lines: [
                        { label: 'Role', value: 'Part-time, work from home' },
                        { label: 'Pay', value: '3,000 to 8,000 a day' },
                        { label: 'Task', value: 'Like videos, rate products' },
                        { label: 'To start', value: 'Pay a 2,000 registration fee' },
                    ],
                    trap: 3,
                    explain: 'No employer charges you to work. The first tasks pay small amounts to build trust; the "premium tasks" then need larger deposits that never come back. The daily pay figure is the bait, the fee is the hook.',
                },
                {
                    id: 's5', type: 'spotTrap',
                    prompt: 'A call about a parcel. Tap the tell.',
                    lines: [
                        { label: 'Caller', value: 'Courier company, then "police"' },
                        { label: 'Claim', value: 'A parcel in your name contains drugs' },
                        { label: 'Action', value: 'Stay on video call, transfer funds to a "safe account" for verification' },
                        { label: 'Threat', value: 'Arrest within the hour' },
                    ],
                    trap: 2,
                    explain: 'This is the "digital arrest" scam. No police force verifies innocence by having you transfer money, and none keeps you on a video call. Hang up. Real police do not call about parcels.',
                },
                {
                    id: 's6', type: 'orderSteps',
                    prompt: 'You realise you have been scammed. What is the order?',
                    steps: [
                        'Call your bank and freeze the card or account',
                        'Report on the cybercrime helpline 1930 or cybercrime.gov.in',
                        'Change the passwords and UPI PIN',
                        'File a complaint with the local police',
                    ],
                    explain: 'Freezing first stops further loss. The 1930 helpline can put a hold on money still moving through the banking system if called within the first hour or so; the earlier, the better the odds.',
                },
                {
                    id: 's7', type: 'trueFalse',
                    statement: 'Screen-sharing apps like AnyDesk are a normal part of bank customer support.',
                    answer: false,
                    explain: 'No bank asks you to install a screen-sharing app. Once installed, the caller sees your banking app, your OTPs and your PIN as you type them. If you have installed one on someone\'s instruction, uninstall it and change every PIN.',
                },
            ],
        },
    ],
};
