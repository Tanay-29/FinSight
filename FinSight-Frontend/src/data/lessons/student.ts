/**
 * Track: Student.
 *
 * Money before a salary: the first bank account, UPI and the things that
 * go wrong with it, the education loan most people sign without reading,
 * and what it costs to live away from home. Comes first in the track order
 * because it is where most of the app's users are.
 */
import type { Track } from './schema';

export const STUDENT: Track = {
    id: 'student',
    title: 'Student',
    description: 'Bank accounts, UPI, education loans and living away',
    audience: 'Anyone managing money before a first salary',
    lessons: [
        {
            id: 'st_account',
            title: 'Your first bank account',
            summary: 'What to open, what it costs, and the three settings to check',
            minutes: 3,
            cards: [
                {
                    id: 'a1', type: 'info',
                    title: 'The account is the base',
                    body: 'Every other thing in this app runs through a bank account: UPI, a card, a SIP, a salary. The choices are small but they stick for years, so it is worth ten minutes now.',
                },
                {
                    id: 'a2', type: 'spotTrap',
                    prompt: 'Two account options at the same bank. Tap the line that costs a student money.',
                    lines: [
                        { label: 'Account type', value: 'Regular savings' },
                        { label: 'Minimum balance', value: '10,000 or 600 a quarter penalty' },
                        { label: 'Debit card fee', value: '150 a year' },
                        { label: 'Interest', value: '3% a year' },
                        { label: 'UPI', value: 'Free' },
                    ],
                    trap: 1,
                    explain: 'A minimum balance penalty on a student account is 2,400 a year for the crime of being broke. Ask for a basic savings account or a student or salary variant: zero balance, same UPI, same card.',
                },
                {
                    id: 'a3', type: 'tapSort',
                    prompt: 'Do these belong in your first account setup?',
                    buckets: ['Do it', 'Skip it'],
                    items: [
                        { label: 'Add a nominee', bucket: 0 },
                        { label: 'Turn on SMS and email alerts', bucket: 0 },
                        { label: 'Take the "free" credit card the branch pushes', bucket: 1 },
                        { label: 'Set a daily UPI limit you are comfortable with', bucket: 0 },
                        { label: 'Buy the insurance bundle at the counter', bucket: 1 },
                        { label: 'Link the account to Aadhaar for DBT and scholarships', bucket: 0 },
                    ],
                    explain: 'Nominee, alerts and a UPI cap are five minutes each and matter for years. Anything sold at the counter can wait until you have read it at home.',
                },
                {
                    id: 'a4', type: 'trueFalse',
                    statement: 'Interest on a savings account is tax-free.',
                    answer: false,
                    explain: 'It is income. Section 80TTA exempts the first 10,000 a year under the old regime; beyond that, or under the new regime, it is added to your income. Small for a student, but it is why bank interest shows up in the AIS.',
                },
                {
                    id: 'a5', type: 'choice',
                    prompt: 'A branch says the "zero-balance" account is not available today. What do you do?',
                    options: ['Take the regular one, switch later', 'Ask for a Basic Savings Bank Deposit account by name; every bank must offer it', 'Try a different bank', 'Open online instead'],
                    answer: 1,
                    explain: 'RBI requires every bank to offer a BSBD account with no minimum balance. Naming it usually ends the conversation. Switching later means a new account number on every form you have ever filled.',
                },
            ],
        },
        {
            id: 'st_upi',
            title: 'UPI, and the ways it goes wrong',
            summary: 'Collect requests, wrong transfers, autopay, and the limit that saves you',
            minutes: 4,
            cards: [
                {
                    id: 'u1', type: 'info',
                    title: 'Fast is the feature and the risk',
                    body: 'UPI moves money in seconds and cannot be reversed by you. The bank can only request the other side return it. So the habits that matter are the ones before you tap: who is asking, which direction is the money going, and is this a one-time thing or a mandate.',
                },
                {
                    id: 'u2', type: 'choice',
                    prompt: 'A UPI request arrives: "Approve to receive 2,000 refund". What happens if you enter your PIN?',
                    options: ['You receive 2,000', 'You pay 2,000', 'Nothing until the sender confirms', 'The bank checks first'],
                    answer: 1,
                    explain: 'Your PIN only ever authorises money leaving your account. Receiving needs nothing from you. Any "enter PIN to receive" is a payment dressed as a refund.',
                },
                {
                    id: 'u3', type: 'orderSteps',
                    prompt: 'You sent 3,000 to the wrong UPI ID. In order:',
                    steps: [
                        'Screenshot the transaction with the UTR number',
                        'Raise a dispute in the UPI app immediately',
                        'Call your bank and quote the UTR',
                        'If unresolved in 30 days, escalate to the banking ombudsman',
                    ],
                    explain: 'The UTR is the reference every step needs. Speed matters because the receiving bank can hold funds only if the money is still there.',
                },
                {
                    id: 'u4', type: 'spotTrap',
                    prompt: 'Your UPI app\'s autopay list. Tap the one that should not be there.',
                    lines: [
                        { label: 'Music streaming', value: '119 monthly' },
                        { label: 'Mutual fund SIP', value: '1,000 monthly' },
                        { label: 'Gaming top-up', value: '499 weekly' },
                        { label: 'Phone recharge', value: '299 monthly' },
                    ],
                    trap: 2,
                    explain: 'A weekly mandate for a top-up is 26,000 a year, set once and never seen again. Autopay is right for things you would pay anyway; check the list every few months, and cancel from the UPI app, not the merchant.',
                },
                {
                    id: 'u5', type: 'trueFalse',
                    statement: 'Setting a low daily UPI limit protects you if your phone is stolen.',
                    answer: true,
                    explain: 'A 5,000 daily cap limits what a thief with your unlocked phone can move before you block the SIM. Raise it for the day you need to; it takes a minute.',
                },
            ],
        },
        {
            id: 'st_eduloan',
            title: 'The education loan',
            summary: 'Moratorium, simple interest, and the 80E deduction',
            minutes: 4,
            cards: [
                {
                    id: 'l1', type: 'info',
                    title: 'Interest starts on day one',
                    body: 'An education loan has a moratorium: no EMI during the course and usually six to twelve months after. Interest still accrues the whole time. On a 10 lakh loan at 10 percent over a four-year course, that is roughly 4 lakh added before the first EMI.',
                },
                {
                    id: 'l2', type: 'estimate',
                    prompt: '8 lakh disbursed at 10 percent, simple interest, over a 4-year course plus a 1-year moratorium. Roughly how much interest builds up before EMIs start?',
                    unit: 'inr', min: 100000, max: 800000, step: 50000,
                    answer: 400000, tolerance: 0.15,
                    explain: 'About 4 lakh: 8 lakh at 10 percent is 80,000 a year, for five years. Real loans disburse in tranches so the figure is somewhat lower, but the shape is the point: half the loan again, before you have earned anything.',
                },
                {
                    id: 'l3', type: 'choice',
                    prompt: 'You have some money from an internship during the course. What is the best use against the loan?',
                    options: ['Nothing, wait for the moratorium to end', 'Pay the accruing interest each month; many banks give a rate cut for it', 'Save it for the first EMI', 'Prepay principal'],
                    answer: 1,
                    explain: 'Servicing interest during the moratorium stops it from being added to principal, and most public-sector banks knock 0.5 to 1 percent off the rate for borrowers who do. It is the highest-return use of a student\'s spare money.',
                },
                {
                    id: 'l4', type: 'trueFalse',
                    statement: 'The interest you pay on an education loan is deductible from your taxable income.',
                    answer: true,
                    explain: 'Section 80E, old regime: the full interest, no cap, for eight years from the first repayment. Principal is not deductible. Under the new regime the deduction does not apply.',
                },
                {
                    id: 'l5', type: 'tapSort',
                    prompt: 'Who is on the hook?',
                    buckets: ['Affects your record', 'Does not'],
                    items: [
                        { label: 'A missed education loan EMI', bucket: 0 },
                        { label: 'Your parent co-signing as guarantor', bucket: 0 },
                        { label: 'A scholarship you received', bucket: 1 },
                        { label: 'The moratorium period itself', bucket: 1 },
                    ],
                    explain: 'The loan is in your name and the guarantor\'s. A missed EMI marks both files. The moratorium is not a default; it is the agreed schedule.',
                },
            ],
        },
        {
            id: 'st_living',
            title: 'Living away from home',
            summary: 'Hostel, PG or a flat, and the deposit nobody budgets for',
            minutes: 3,
            cards: [
                {
                    id: 'v1', type: 'info',
                    title: 'The first month costs three',
                    body: 'A flat asks for a deposit of two to three months\' rent up front, plus the first month, plus a broker in some cities. Hostels and PGs ask less, include more, and give back less freedom. None of them is wrong; the mistake is comparing only the monthly rent.',
                },
                {
                    id: 'v2', type: 'estimate',
                    prompt: 'A flat at 12,000 a month with a two-month deposit and one month\'s brokerage. What do you hand over on day one?',
                    unit: 'inr', min: 12000, max: 72000, step: 6000,
                    answer: 48000, tolerance: 0.01,
                    explain: 'Four months\' rent: 24,000 deposit, 12,000 brokerage, 12,000 first month. The deposit is yours and should come back; get it in writing with the deductions the landlord may make listed.',
                },
                {
                    id: 'v3', type: 'tapSort',
                    prompt: 'Which of these is usually included in a PG but extra in a flat?',
                    buckets: ['Included in a PG', 'Extra in a flat'],
                    items: [
                        { label: 'Electricity', bucket: 1 },
                        { label: 'Wi-fi', bucket: 0 },
                        { label: 'Meals', bucket: 0 },
                        { label: 'Furniture', bucket: 1 },
                        { label: 'Housekeeping', bucket: 0 },
                        { label: 'Society maintenance', bucket: 1 },
                    ],
                    explain: 'Add electricity, maintenance, furniture and food to a flat\'s rent before comparing it to a PG. A 12,000 flat is often a 19,000 flat.',
                },
                {
                    id: 'v4', type: 'choice',
                    prompt: 'The landlord wants the deposit in cash with no agreement. What is the cost of saying yes?',
                    options: ['Nothing, it is normal', 'No proof the deposit exists, and no HRA claim later', 'A small discount', 'Faster move-in only'],
                    answer: 1,
                    explain: 'Without a signed agreement and a bank transfer there is no record of the deposit, no rent receipts for an HRA claim, and no recourse if it is not returned. A registered agreement costs a few hundred rupees.',
                },
                {
                    id: 'v5', type: 'trueFalse',
                    statement: 'Splitting a flat three ways means splitting the deposit risk three ways.',
                    answer: false,
                    explain: 'The person whose name is on the agreement carries the deposit and the liability. If a flatmate leaves without paying, the landlord deducts from the named tenant. Put everyone on the agreement, or collect deposits from flatmates up front.',
                },
            ],
        },
    ],
};
