/**
 * Track: First Job.
 *
 * For the month between the offer letter and the first payslip. Every rupee
 * figure that is not computed live by an explorable was checked against
 * utils/moneyMath.ts with the FY 2025-26 constants, so the estimates a card
 * accepts agree with what the slider on the next card shows.
 */
import type { Track } from './schema';

export const FIRST_JOB: Track = {
    id: 'firstJob',
    title: 'First Job',
    description: 'CTC, payslips, EPF and your first tax year',
    audience: 'Anyone between an offer letter and a first payslip',
    lessons: [
        {
            id: 'fj_ctc',
            title: 'CTC is not your salary',
            summary: 'Why the number on the offer letter never reaches your bank',
            minutes: 4,
            cards: [
                {
                    id: 'c1', type: 'info',
                    title: 'The number on the offer letter',
                    body: 'CTC means cost to company. It is what employing you costs them, not what you get paid. It includes money that goes straight to your provident fund, and sometimes gratuity and insurance you never see in cash.',
                },
                {
                    id: 'c2', type: 'estimate',
                    prompt: 'An offer says 6 lakh CTC. Roughly how much lands in the bank each month?',
                    unit: 'inr', min: 30000, max: 50000, step: 1000,
                    answer: 45000, tolerance: 0.06,
                    explain: 'About 45,000, not 50,000. Of the 50,000 a month, 2,400 is the employer PF that was never yours to spend, 2,400 is your own PF contribution, and 200 is professional tax. No TDS at this income under the new regime. The exact split depends on how the company structures the CTC.',
                },
                {
                    id: 'c3', type: 'explorable',
                    explorable: 'salarySlip',
                    prompt: 'Drag the CTC and watch where the money goes. Notice when TDS starts.',
                    question: {
                        prompt: 'At what CTC does tax start being deducted every month?',
                        options: ['Around 7 lakh', 'Around 13 lakh', 'From the first rupee', 'Only above 25 lakh'],
                        answer: 1,
                        explain: 'Under the new regime, income up to 12 lakh after the 75,000 standard deduction pays nothing thanks to the Section 87A rebate. With PF taken out of CTC first, TDS starts appearing at roughly 13 lakh CTC.',
                    },
                },
                {
                    id: 'c4', type: 'trueFalse',
                    statement: 'The employer share of PF is part of your CTC.',
                    answer: true,
                    explain: 'Yes, and that is the biggest reason CTC and in-hand differ. It is real money, it is yours, but it sits in your EPF account until you retire or withdraw under the rules.',
                },
                {
                    id: 'c5', type: 'choice',
                    prompt: 'Two offers: 6.5 lakh CTC with a 1 lakh variable bonus, or 6 lakh CTC all fixed. Which pays more in a normal month?',
                    options: ['The 6.5 lakh offer', 'The 6 lakh offer', 'They are identical', 'Cannot tell from CTC alone'],
                    answer: 1,
                    explain: 'Variable pay is paid later, partly, or not at all, depending on targets. Fixed CTC of 5.5 lakh versus 6 lakh means the second offer pays more every month. Always ask for the fixed component.',
                },
                {
                    id: 'c6', type: 'info',
                    title: 'One question to ask HR',
                    body: '"What is the fixed monthly gross, and what is the in-hand after PF and tax?" Any HR team can answer it in a minute. If they will not, that tells you something too.',
                },
            ],
        },
        {
            id: 'fj_payslip',
            title: 'Reading a payslip',
            summary: 'Earnings on the left, deductions on the right, and what should never be there',
            minutes: 4,
            cards: [
                {
                    id: 'p1', type: 'info',
                    title: 'Two columns',
                    body: 'Every payslip is the same shape. Earnings on one side: basic, HRA, allowances. Deductions on the other: your PF, professional tax, TDS. Net pay is the difference. If you can read those two columns, you can read any payslip in India.',
                },
                {
                    id: 'p2', type: 'tapSort',
                    prompt: 'Sort each line into the column it belongs to',
                    buckets: ['Earnings', 'Deductions'],
                    items: [
                        { label: 'Basic', bucket: 0 },
                        { label: 'HRA', bucket: 0 },
                        { label: 'Employee PF', bucket: 1 },
                        { label: 'Special allowance', bucket: 0 },
                        { label: 'Professional tax', bucket: 1 },
                        { label: 'TDS', bucket: 1 },
                    ],
                    explain: 'HRA and special allowance are earnings even though they look like jargon. PF, professional tax and TDS are the three deductions almost everyone has.',
                },
                {
                    id: 'p3', type: 'spotTrap',
                    prompt: 'This payslip has one line that is wrong. Tap it.',
                    lines: [
                        { label: 'Basic', value: '20,000' },
                        { label: 'HRA', value: '10,000' },
                        { label: 'Special allowance', value: '17,600' },
                        { label: 'Employee PF', value: '2,400' },
                        { label: 'Professional tax', value: '2,000' },
                        { label: 'Net pay', value: '43,200' },
                    ],
                    trap: 4,
                    explain: 'Professional tax is capped at 2,500 a year by the Constitution, so 2,000 a month is impossible. The usual figure is 200 a month. A line like this is worth an email to payroll.',
                },
                {
                    id: 'p4', type: 'choice',
                    prompt: 'Your payslip shows Employee PF but no Employer PF line. Is that a problem?',
                    options: ['Yes, the company is not paying its share', 'No, the employer share is usually not shown on the payslip', 'Yes, you should be paid it in cash', 'Only if you earn above 15,000'],
                    answer: 1,
                    explain: 'The employer share goes straight to EPFO and most payslips leave it off, because it is not part of your gross. Check it on the EPFO passbook instead, which shows both sides.',
                },
                {
                    id: 'p5', type: 'trueFalse',
                    statement: 'HRA is only useful if you actually pay rent.',
                    answer: true,
                    explain: 'HRA is taxable income unless you claim the exemption, and the exemption needs rent receipts. Under the new regime the exemption does not apply at all, so HRA is just a label for part of your pay.',
                },
            ],
        },
        {
            id: 'fj_epf',
            title: 'EPF: the 12 percent you forget',
            summary: 'Where it goes, what it earns, and why you should not withdraw it',
            minutes: 3,
            cards: [
                {
                    id: 'e1', type: 'info',
                    title: 'Two 12 percents',
                    body: 'You put 12 percent of basic into EPF. Your employer puts another 12 percent. Of the employer part, 8.33 percent goes to the pension scheme (EPS, on basic up to 15,000) and the rest to EPF. Both sides are tracked under one UAN that stays with you across jobs.',
                    source: 'https://www.epfindia.gov.in/site_en/For_Employees.php',
                },
                {
                    id: 'e2', type: 'estimate',
                    prompt: 'Basic is 20,000 a month. How much goes into EPF and EPS together each month, from both sides?',
                    unit: 'inr', min: 1000, max: 8000, step: 200,
                    answer: 4800, tolerance: 0.05,
                    explain: '2,400 from you plus 2,400 from the employer. Of the employer 2,400, about 1,250 goes to EPS and the rest to EPF. That is 4,800 a month growing at the EPF rate, 8.25 percent for FY 2024-25.',
                },
                {
                    id: 'e3', type: 'trueFalse',
                    statement: 'When you change jobs you should withdraw your EPF and start fresh.',
                    answer: false,
                    explain: 'Transfer it. Withdrawal before five years of continuous service is taxable, and it breaks the compounding. With a UAN the transfer is an online request, and the balance and the years of service carry over.',
                },
                {
                    id: 'e4', type: 'choice',
                    prompt: 'What is the UAN?',
                    options: ['A tax identification number', 'One number that links all your EPF accounts across employers', 'Your bank account for PF', 'A company code'],
                    answer: 1,
                    explain: 'Universal Account Number. Each job opens a new member id, but they all sit under one UAN. Activate it on the EPFO portal in your first month so you can see the passbook.',
                },
                {
                    id: 'e5', type: 'choice',
                    prompt: 'Your employer has been deducting PF but the EPFO passbook shows nothing for three months. What do you do?',
                    options: ['Wait, it takes a year to show', 'Raise it with HR in writing, then EPFO grievance if unresolved', 'Nothing, the money is safe with the company', 'Withdraw whatever is there'],
                    answer: 1,
                    explain: 'Deducted-but-not-deposited PF is a real problem and a criminal offence for the employer. Contributions should appear within a month or two. Put it in writing so there is a record.',
                },
            ],
        },
        {
            id: 'fj_taxyear',
            title: 'Your first tax year',
            summary: 'TDS, Form 16, the regime choice and the July deadline',
            minutes: 5,
            cards: [
                {
                    id: 't1', type: 'info',
                    title: 'The year runs April to March',
                    body: 'Income earned from 1 April to 31 March is one financial year. Your employer deducts tax from each payslip (TDS) based on what you told them in your declaration, then gives you Form 16 summarising it. You file a return to settle the difference.',
                },
                {
                    id: 't2', type: 'orderSteps',
                    prompt: 'Put the tax year in order',
                    steps: [
                        'Submit an investment declaration to HR in April',
                        'TDS deducted from each monthly payslip',
                        'Employer issues Form 16 by 15 June',
                        'File the ITR, usually by 31 July',
                        'Refund arrives if TDS was more than tax owed',
                    ],
                    explain: 'Declaration first, because it sets how much TDS is taken. Form 16 comes after the year ends, and you cannot file before you have it.',
                },
                {
                    id: 't3', type: 'explorable',
                    explorable: 'regimeCompare',
                    prompt: 'Set an income, then toggle deductions and see which regime wins.',
                    question: {
                        prompt: 'At 8 lakh with the full 1.5 lakh of 80C claimed, which regime is cheaper?',
                        options: ['Old regime', 'New regime', 'Exactly equal', 'Depends on the city'],
                        answer: 1,
                        explain: 'New regime, and by a lot: it owes nothing at 8 lakh because of the 87A rebate, while the old regime with 1.5 lakh of 80C still owes about 33,800. The old regime only starts winning at higher incomes with several large deductions stacked.',
                    },
                },
                {
                    id: 't4', type: 'choice',
                    prompt: 'You are salaried, earn under 50 lakh, and have some bank interest. Which form?',
                    options: ['ITR-1 (Sahaj)', 'ITR-2', 'ITR-3', 'ITR-4 (Sugam)'],
                    answer: 0,
                    explain: 'ITR-1 is for salary, one house property and other sources like interest, up to 50 lakh. ITR-2 is needed once you have capital gains above the small-investor limit, more than one property, or foreign assets.',
                },
                {
                    id: 't5', type: 'trueFalse',
                    statement: 'Form 16 comes from the Income Tax Department.',
                    answer: false,
                    explain: 'It comes from your employer. It is their certificate of the tax they deducted and deposited on your behalf. The Department has its own view of your income in the AIS and Form 26AS, and the two should match.',
                },
                {
                    id: 't6', type: 'choice',
                    prompt: 'Your TDS this year was 12,000 but your actual tax works out to 4,000. What happens?',
                    options: ['Nothing, TDS is final', 'You get an 8,000 refund after filing', 'You owe 8,000 more', 'The employer refunds it in March'],
                    answer: 1,
                    explain: 'Filing is how you claim it back. This happens a lot in a first job, because TDS is deducted on a full-year projection even if you joined mid-year. Not filing means leaving the refund with the government.',
                },
            ],
        },
    ],
};
