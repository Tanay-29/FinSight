/**
 * Life sim: Side Hustle, twelve months.
 *
 * A 30,000 a month part-time job, and freelance work on top. The year is
 * about the things nobody tells a first-time freelancer: TDS on invoices,
 * the GST threshold, advance tax dates, presumptive taxation under 44ADA,
 * clients who do not pay, and which ITR form the whole thing lands on.
 *
 * Figures use FY 2025-26 rules: 20 lakh GST registration threshold for
 * services, 44ADA at 50 percent of receipts, advance tax in four instalments
 * or one by 15 March for presumptive filers, 10 percent TDS under 194J.
 */
import type { Scenario } from './schema';

export const SIDE_HUSTLE: Scenario = {
    id: 'sideHustle',
    title: 'Side Hustle',
    summary: 'A part-time job, freelance clients, and the tax year nobody explains',
    minutes: 8,
    start: {
        cash: 10_000,
        monthlyIncome: 30_000,
        fixedCosts: [
            { label: 'Rent, food, transport, phone, everything else', amount: 24_000 },
        ],
        credit: 50,
        peace: 70,
    },
    debtMonthlyRate: 0.035,
    scenes: [
        {
            id: 'firstClient', month: 1,
            title: 'The first client',
            body: 'A startup wants a 40,000 design project. Their accounts team asks for an invoice with your PAN, and says they will deduct 10 percent TDS.',
            options: [
                { label: 'Send a proper invoice with PAN, accept the TDS', outcome: 'You receive 36,000. The 4,000 is not lost: it is deposited against your PAN and shows in your Form 26AS, to be set off against tax you owe or refunded when you file.', effect: { cash: 36_000, peace: 2, setFlag: 'onRecord' }, tag: 'wise' },
                { label: 'Ask them to pay the full 40,000 to your UPI, no invoice', outcome: 'A company cannot legally do this for professional fees, and one that agrees is one that will not pay on time. If they pay without your PAN, the law makes them deduct 20 percent, not 10.', effect: { cash: 32_000, peace: -4 }, tag: 'costly' },
                { label: 'Route it through a friend who has a registered firm', outcome: 'The income is now in your friend\'s books, the tax is their problem, and the 40,000 is a loan they owe you with nothing in writing. Two problems for the price of one.', effect: { cash: 38_000, peace: -6, credit: 0 }, tag: 'costly' },
            ],
        },
        {
            id: 'account', month: 2,
            title: 'Where does the money land?',
            body: 'Client payments are arriving in the same account as your salary and your food orders. A second account is free to open.',
            options: [
                { label: 'Open a separate account for freelance income and expenses', outcome: 'Every gig rupee in, every gig expense out, in one statement. At filing time that statement is your books. This is the single cheapest thing a freelancer can do.', effect: { peace: 4, setFlag: 'separateAccount' }, tag: 'wise' },
                { label: 'Keep everything in one account, sort it out later', outcome: 'Later is March, when you are trying to find twelve client payments among four hundred UPI transactions.', effect: { peace: -2 }, tag: 'ok' },
            ],
        },
        {
            id: 'laptop', month: 3,
            title: 'The laptop is the business',
            body: 'Your laptop is dying and the work needs a real one. A 70,000 machine, or a 25,000 refurbished one that does the job for now.',
            options: [
                { label: 'Buy the 25,000 refurbished one, keep the invoice in your name', outcome: 'A tool bought for the work is a business expense. Keep the invoice. Under regular books it reduces your taxable profit; under 44ADA it is already assumed in the 50 percent.', effect: { cash: -25_000, peace: 2, setFlag: 'expenseKept' }, tag: 'wise', requiresCash: 25_000 },
                { label: '70,000 on a 12-month no-cost EMI', outcome: 'About 5,900 a month against an income that arrives when clients feel like it. Freelancers should carry fewer fixed costs than employees, not more.', effect: { cash: -700, monthly: { label: 'Laptop EMI', amount: 5_900 }, credit: 1, peace: -4 }, tag: 'costly' },
                { label: 'Borrow a friend\'s for now', outcome: 'Free, and you cannot take on the next project until it is returned.', effect: { peace: -3 }, tag: 'ok' },
            ],
        },
        {
            id: 'gst', month: 4,
            title: 'A client asks for a GST invoice',
            body: 'A bigger company\'s finance team says they can only process invoices with a GSTIN. Your freelance income this year will be well under 20 lakh.',
            options: [
                { label: 'Explain you are below the 20 lakh threshold and not required to register', outcome: 'Correct. Services under 20 lakh a year (10 lakh in some special-category states) need no GST registration. Most finance teams accept a declaration to that effect.', effect: { cash: 30_000, peace: 2 }, tag: 'wise' },
                { label: 'Register for GST so you look professional', outcome: 'Registration is voluntary and permanent in practice: monthly or quarterly returns, 18 percent added to every invoice, and penalties for late filing even in months with no income. Not for a 3 lakh side income.', effect: { cash: 30_000, monthly: { label: 'GST filing (CA fee)', amount: 1_000 }, peace: -5 }, tag: 'costly' },
                { label: 'Add 18 percent GST to the invoice without registering', outcome: 'Collecting GST you are not registered to collect is an offence, and the client\'s auditor will find the missing GSTIN. You lose the client, and possibly more.', effect: { cash: 0, peace: -12 }, tag: 'costly' },
            ],
        },
        {
            id: 'advanceTax1', month: 5,
            title: '15 September',
            body: 'A reminder from a tax app: advance tax is due if your total tax for the year will cross 10,000. With salary TDS covering the job, the freelance income is what matters.',
            options: [
                { label: 'Estimate the year, pay the instalment now', outcome: 'Advance tax is paid in four instalments for regular filers. Paying on time avoids interest under sections 234B and 234C, which is small but adds up and is entirely avoidable.', effect: { cash: -4_000, peace: 3, setFlag: 'advancePaid' }, tag: 'wise' },
                { label: 'Plan to file under 44ADA and pay everything by 15 March', outcome: 'Also correct. Presumptive filers get a single advance tax date, 15 March. The catch is having the money in March; the next few months decide that.', effect: { peace: 1, setFlag: 'presumptivePlan' }, tag: 'wise' },
                { label: 'Ignore it, tax is a July problem', outcome: 'Interest at 1 percent a month accrues on the shortfall from each missed date. It is not large money; it is the habit of treating tax as a surprise that costs.', effect: { peace: -2, setFlag: 'ignoredAdvance' }, tag: 'costly' },
            ],
        },
        {
            id: 'unpaid', month: 6,
            title: 'The client who does not pay',
            body: 'A 25,000 invoice is 60 days overdue. The founder has stopped replying. Rent is due.',
            options: [
                { label: 'Send a formal reminder with the invoice, and stop work until paid', outcome: 'Most late payers pay when the request is in writing with a date. Working while unpaid only raises what they owe. It arrives, late.', effect: { cash: 25_000, peace: -3 }, tag: 'wise' },
                { label: 'Keep working, they seem stressed', outcome: 'Now they owe you 40,000 and the situation is the same. Kindness to a client who does not pay is a loan you did not agree to.', effect: { peace: -6, setFlag: 'stillUnpaid' }, tag: 'costly' },
                { label: 'Take a 25,000 instant loan to cover rent', outcome: 'Rent is covered at 30 percent a year, plus a fee, for a receivable that was already yours. If the money was ever coming, the loan was unnecessary; if it was not, the loan is the least of it.', effect: { cash: 25_000, debt: 26_000, credit: -4, peace: -6 }, tag: 'costly' },
            ],
        },
        {
            id: 'bigMonth', month: 7,
            title: 'The big month',
            body: 'Two projects land at once. 1,20,000 after TDS, in one month.',
            options: [
                { label: 'Set 30 percent aside for tax, invest half the rest', outcome: 'Thirty-six thousand parked for March, forty-two thousand into the index fund, forty-two thousand to live on. This is the month that decides whether March is calm.', effect: { cash: 120_000, investOnce: 42_000, peace: 6, setFlag: 'taxSetAside' }, tag: 'wise' },
                { label: 'Straight into the index fund, all of it', outcome: 'Good instinct, wrong amount. Tax is due on this money in March and pulling it back out then means selling in a hurry.', effect: { cash: 120_000, investOnce: 120_000, peace: 2 }, tag: 'ok' },
                { label: 'It has been a hard year, spend it', outcome: 'A month of income that felt like a bonus, treated like one. The tax on it is still due in March, from whatever is left.', effect: { cash: 120_000, monthly: { label: 'Lifestyle', amount: 8_000 }, peace: 6 }, tag: 'costly' },
            ],
        },
        {
            id: 'presumptive', month: 8,
            title: 'A CA explains 44ADA',
            body: 'Section 44ADA: a freelancer in a listed profession with receipts under 75 lakh can declare 50 percent of receipts as profit and skip the books entirely. Or keep full books and deduct actual expenses.',
            options: [
                { label: 'Go presumptive: 50 percent of receipts as income, no books', outcome: 'For a freelancer whose real expenses are well under half of income, this is the simplest and often the cheapest route. ITR-4, one page of receipts, done.', effect: { peace: 5, setFlag: 'presumptive' }, tag: 'wise' },
                { label: 'Keep full books and deduct actual expenses', outcome: 'Right if your expenses genuinely exceed 50 percent of receipts, which for a laptop and a phone they do not. Otherwise it is more work for more tax, and an audit if receipts cross the limit.', effect: { monthly: { label: 'Bookkeeping', amount: 1_500 }, peace: -2 }, tag: 'ok' },
                { label: 'Do not file. The freelance income is small and paid to UPI', outcome: 'The client deducted TDS against your PAN in month one. The Income Tax Department already knows the income exists; not filing is the one way to make a small amount into a notice.', effect: { peace: -8, setFlag: 'notFiling' }, tag: 'costly' },
            ],
        },
        {
            id: 'foreign', month: 9,
            title: 'A client abroad',
            body: 'A US client wants to pay 1,000 dollars. They ask how.',
            options: [
                { label: 'Bank transfer or a payment platform to your own account, with the purpose code for services', outcome: 'About 83,000 lands with a foreign inward remittance record. Export of services is zero-rated for GST, and the record is what makes the income clean at filing time.', effect: { cash: 83_000, peace: 3 }, tag: 'wise' },
                { label: 'Have a cousin in the US receive it and send rupees from their Indian account', outcome: 'Informal cross-border settlement is exactly the thing FEMA prohibits, and the money now looks like a gift from a relative. Cheaper on fees, expensive on everything else.', effect: { cash: 83_000, peace: -6 }, tag: 'costly' },
                { label: 'Accept crypto to avoid the bank charges', outcome: 'Crypto received for services is taxable as income at your slab, and converting it later is taxed again at 30 percent flat on any gain, with no set-off. The bank charges were a few hundred rupees.', effect: { cash: 80_000, peace: -4 }, tag: 'costly' },
            ],
        },
        {
            id: 'advanceTax3', month: 10,
            title: '15 December',
            body: 'Third advance tax date for regular filers. The year\'s freelance income is clearer now.',
            hideIfFlag: 'presumptivePlan',
            options: [
                { label: 'Pay the instalment', outcome: 'On time, from money you have. The March balance will be small.', effect: { cash: -8_000, peace: 2 }, tag: 'wise' },
                { label: 'Skip it, pay everything in March', outcome: 'Interest on the shortfall for three months. Not a disaster, and not free.', effect: { peace: -1 }, tag: 'ok' },
            ],
        },
        {
            id: 'marchTax', month: 11,
            title: '15 March',
            body: 'Final advance tax date. Between the job and the freelance work, about 28,000 of tax is due for the year, less the TDS already deducted against you. If earlier instalments were skipped, interest under 234C is added on top.',
            options: [
                { label: 'Pay it from the money set aside', outcome: 'Set aside in month seven, paid in month eleven. This is what the 30 percent rule is for. Nothing else happened.', effect: { cash: -20_000, peace: 6 }, tag: 'wise', requiresFlag: 'taxSetAside' },
                { label: 'Pay it from cash', outcome: 'Paid, on time, from whatever was in the account. A tighter month than it needed to be.', effect: { cash: -20_000, peace: 0 }, tag: 'ok', requiresCash: 20_000 },
                { label: 'Redeem investments to pay it', outcome: 'Selling in a hurry, possibly at a loss, to pay a bill you knew about in July.', effect: { cash: 0, peace: -5 }, tag: 'costly' },
                { label: 'Put it on the credit card', outcome: 'Tax at 3.5 percent a month. The interest on this alone will exceed the 234C interest you were avoiding, many times over.', effect: { debt: 20_000, credit: -4, peace: -6 }, tag: 'costly' },
            ],
        },
        {
            id: 'notice', month: 12,
            title: 'A notice',
            body: 'An email from the Income Tax Department: TDS was deducted against your PAN by two companies and no return was filed. Respond within 30 days.',
            showIfFlag: 'notFiling',
            options: [
                { label: 'File the belated return, pay the tax with the late fee', outcome: 'Tax, interest, and a late fee of up to 5,000. Painful, and the end of it. The TDS credits are still yours to set off.', effect: { cash: -30_000, peace: -8 }, tag: 'ok' },
                { label: 'Ignore it, the amount is small', outcome: 'A notice ignored becomes a best-judgement assessment: the Department estimates your income without you, adds penalty, and the demand follows your PAN until it is paid.', effect: { cash: -45_000, credit: -15, peace: -25 }, tag: 'costly' },
            ],
        },
        {
            id: 'filing', month: 12,
            title: 'Filing',
            hideIfFlag: 'notFiling',
            body: 'Form 16 from the job, Form 26AS showing the TDS clients deducted, and a year of freelance receipts. Which return?',
            options: [
                { label: 'ITR-4: salary plus presumptive professional income', outcome: 'The right form for a salaried person with 44ADA income. The TDS the clients deducted comes back as credit; if it exceeds tax due, a refund follows.', effect: { cash: 6_000, peace: 8 }, tag: 'wise' },
                { label: 'ITR-1, salary only, leave the freelance income out', outcome: 'The freelance TDS is already sitting in your 26AS. A return that omits the income it was deducted on is the most automated mismatch there is.', effect: { peace: -10, credit: -2 }, tag: 'costly' },
                { label: 'Pay a CA 3,000 to sort it out', outcome: 'A fair price for a first year with two income sources. The 6,000 refund still arrives; 3,000 of it paid the CA. Watch what they do; next year you can do it yourself.', effect: { cash: 3_000, peace: 5 }, tag: 'ok' },
            ],
        },
    ],
};
