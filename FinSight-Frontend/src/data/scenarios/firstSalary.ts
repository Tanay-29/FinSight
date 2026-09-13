/**
 * Life sim: First Salary, twelve months.
 *
 * In-hand of 45,000 a month, which is what a 6 lakh CTC comes to under the
 * assumptions in utils/moneyMath.ts, in a city where rent is 12,000. The
 * decisions are the ones a first year actually contains; none of them is a
 * trick, and every option is something real people choose.
 *
 * Effects are in rupees and points. Credit health and peace of mind are 0 to
 * 100 and are illustrative, not a bureau score.
 */
import type { Scenario } from './schema';

export const FIRST_SALARY: Scenario = {
    id: 'firstSalary',
    title: 'First Salary',
    summary: 'Twelve months, twelve decisions, one scorecard',
    minutes: 8,
    start: {
        cash: 5_000,
        monthlyIncome: 45_000,
        fixedCosts: [
            { label: 'Rent', amount: 12_000 },
            { label: 'Food', amount: 7_000 },
            { label: 'Transport', amount: 2_500 },
            { label: 'Phone and internet', amount: 1_000 },
            { label: 'Eating out, subscriptions, everything else', amount: 9_000 },
        ],
        credit: 50,
        peace: 70,
    },
    debtMonthlyRate: 0.035,
    scenes: [
        {
            id: 'laptop', month: 1,
            title: 'The laptop question',
            body: 'First salary is in. Your college laptop wheezes. A 60,000 model is on offer at "no-cost EMI", 2,500 a month for 24 months. The office one is slow but works.',
            options: [
                { label: 'Take the 24-month EMI', outcome: 'It is a two-year commitment of 2,500 a month, reported to the bureau as a loan, and the "no-cost" part still cost a 999 fee plus GST. It works, but it is the first fixed line on a budget that has not been drawn yet.', effect: { cash: -1_200, monthly: { label: 'Laptop EMI', amount: 2_500 }, credit: 2, peace: -3 }, tag: 'costly' },
                { label: 'Use the office one, save 10,000 a month toward it', outcome: 'Six months from now you buy it outright, probably at a better price, with no line on your credit file. The office laptop is annoying for six months. That is the whole cost.', effect: { peace: -2 }, tag: 'wise' },
                { label: 'Buy a 25,000 refurbished one on the card next month', outcome: 'A middle path: a fraction of the price, paid off in one statement. It will do for two years.', effect: { cash: -25_000, peace: 2 }, tag: 'ok', requiresCash: 25_000 },
            ],
        },
        {
            id: 'card', month: 2,
            title: 'The bank calls',
            body: 'Your salary account bank offers a credit card, 1 lakh limit, lifetime free. You have never had one.',
            options: [
                { label: 'Take it, set auto-pay to the full statement', outcome: 'A card paid in full every month is the cheapest way there is to build a credit history. Auto-pay of the total means the due date cannot be missed.', effect: { credit: 10, peace: 2, setFlag: 'hasCard' }, tag: 'wise' },
                { label: 'Take it, pay manually when the SMS comes', outcome: 'Fine until the month the SMS arrives during a wedding. Every missed due date is a mark that lasts years.', effect: { credit: 6, peace: -2, setFlag: 'hasCard' }, tag: 'ok' },
                { label: 'Decline, cards are trouble', outcome: 'Nothing bad happens, and nothing good either. In three years, when you want a car loan, the bank sees no history at all and prices you as a stranger.', effect: { credit: 0, peace: 1 }, tag: 'ok' },
            ],
        },
        {
            id: 'goa', month: 3,
            title: 'Goa, next weekend',
            body: 'The group is going. Flights, stay and the rest come to 15,000. You have roughly what is left after rent.',
            options: [
                { label: 'Go, pay from cash', outcome: 'You went, it was great, and it came out of money you had. This is what money is for; the question is only whether it was there.', effect: { cash: -15_000, peace: 8 }, tag: 'ok', requiresCash: 15_000 },
                { label: 'Go, put it on the card and pay in full next month', outcome: 'The card gave you 45 days of float at no cost. Next month is tighter by 15,000, and you knew that going in.', effect: { cash: -15_000, peace: 6 }, tag: 'ok', requiresFlag: 'hasCard' },
                { label: 'Go, put it on the card and pay the minimum', outcome: 'The trip now costs 3.5 percent a month on top of itself, and the card has lost its interest-free period on everything else you buy. This is how the first debt starts.', effect: { debt: 15_000, credit: -4, peace: 4 }, tag: 'costly', requiresFlag: 'hasCard' },
                { label: 'Sit this one out', outcome: 'You miss the trip. Your friends survive. The 15,000 is still yours.', effect: { peace: -6 }, tag: 'ok' },
            ],
        },
        {
            id: 'lateSalary', month: 4,
            title: 'Salary is five days late',
            body: 'A payroll glitch. Rent of 12,000 is due on the first, salary lands on the sixth. The landlord is not a patient man.',
            options: [
                { label: 'Pay from the buffer you built', outcome: 'This is exactly what a cash buffer is for. Nothing else happened, which is the point.', effect: { peace: 4 }, tag: 'wise', requiresCash: 12_000 },
                { label: 'Ask your parents to cover it', outcome: 'They did, of course. It costs nothing in rupees and something in how the month felt.', effect: { peace: -8 }, tag: 'ok' },
                { label: 'Take a 12,000 instant loan from an app', outcome: 'Seven-day money at a rate that works out to over 30 percent a year, plus a processing fee, and a small-ticket loan on your bureau file. For five days.', effect: { cash: 12_000, debt: 12_600, credit: -5, peace: -6 }, tag: 'costly' },
            ],
        },
        {
            id: 'declaration', month: 5,
            title: 'HR wants your tax declaration',
            body: 'The payroll portal asks which regime you want and what deductions you plan to claim. It affects the TDS on every payslip from here.',
            options: [
                { label: 'New regime, no declarations', outcome: 'At this income the new regime owes nothing anyway, so the payslip stays whole and there is nothing to prove in January.', effect: { peace: 3 }, tag: 'wise' },
                { label: 'Old regime, declare 1.5 lakh of 80C you have not invested', outcome: 'TDS drops now. In January payroll asks for proofs, and when there are none, the missing tax is recovered from the last three payslips at once.', effect: { peace: -2, setFlag: 'oldNoProof' }, tag: 'costly' },
                { label: 'Ignore the email', outcome: 'Payroll defaults you to the higher-TDS assumption and takes an extra 1,500 a month. You will get it back after you file a return next July, which means the government holds it interest-free for a year.', effect: { monthly: { label: 'Extra TDS (refundable)', amount: 1_500 }, peace: -1 }, tag: 'ok' },
            ],
        },
        {
            id: 'parentsCover', month: 6,
            title: 'An insurance agent, and a real question',
            body: 'Your office cover is 3 lakh and covers you only. A 5 lakh family floater for your parents is 8,000 a year. The agent also has a "savings plan" that "gives back the premium".',
            options: [
                { label: 'Buy the parents\' health cover', outcome: 'Eight thousand a year against a hospital bill that can be sixty. This is the one purchase in the year that is pure downside protection.', effect: { cash: -8_000, peace: 4, setFlag: 'parentsCover' }, tag: 'wise' },
                { label: 'Buy the 24,000 a year savings plan instead', outcome: 'A ULIP: part insurance, part fund, high charges in the early years, and cover far below what a term plan costs. Neither good insurance nor good investing.', effect: { monthly: { label: 'ULIP premium', amount: 2_000 }, peace: -1 }, tag: 'costly' },
                { label: 'Not now, they are healthy', outcome: 'Most years this is fine. It is the one year it is not that the decision was about.', effect: { peace: 0 }, tag: 'costly' },
            ],
        },
        {
            id: 'phone', month: 7,
            title: 'Your phone dies',
            body: 'Screen gone, not worth fixing. A 30,000 replacement is on "no-cost EMI" for six months; a refurbished last-year model is 12,000.',
            options: [
                { label: 'Buy the 30,000 phone outright', outcome: 'You could afford it, so it was just a purchase. No fees, no file entry, no six months of instalments.', effect: { cash: -30_000, peace: 3 }, tag: 'ok', requiresCash: 30_000 },
                { label: 'Six-month no-cost EMI on the 30,000 phone', outcome: 'Five thousand a month plus a fee and GST on the hidden interest, about 2,000 more than cash, and one more loan on the bureau file.', effect: { cash: -600, monthly: { label: 'Phone EMI', amount: 5_000 }, credit: 1, peace: -2 }, tag: 'costly' },
                { label: 'Refurbished for 12,000', outcome: 'It makes calls and runs UPI. Eighteen thousand stayed in your account.', effect: { cash: -12_000, peace: 1 }, tag: 'wise', requiresCash: 12_000 },
            ],
        },
        {
            id: 'sip', month: 8,
            title: 'The app suggests a SIP',
            body: 'A nudge: "Start a 5,000 SIP in an index fund." You have never invested. You also have a year of expenses to think about.',
            options: [
                { label: 'Start 5,000 a month', outcome: 'Five thousand a month into a low-cost index fund, from the day you could. Nothing you do later will matter as much as when you started.', effect: { invest: 5_000, peace: 3 }, tag: 'wise' },
                { label: 'Start 1,000 a month, raise it later', outcome: 'The habit matters more than the amount in year one. A thousand a month that survives is worth more than five that gets cancelled in a tight month.', effect: { invest: 1_000, peace: 2 }, tag: 'wise' },
                { label: 'Not until I have saved more', outcome: 'Reasonable-sounding, and the most common way to never start. Saving and investing are not in sequence; a small SIP is saving.', effect: { peace: 0 }, tag: 'ok' },
            ],
        },
        {
            id: 'hospital', month: 9,
            title: 'Dad is in hospital',
            body: 'Four days, a procedure, a 60,000 bill. He is fine. The bill is not going away.',
            options: [
                { label: 'Claim on the family cover you bought', outcome: 'The floater pays the hospital directly. You cover the 5,000 that fell outside it. This is the month the 8,000 was for.', effect: { cash: -5_000, peace: 10 }, tag: 'wise', requiresFlag: 'parentsCover' },
                { label: 'Pay from savings', outcome: 'It is what savings are for. It also resets a year of building them.', effect: { cash: -60_000, peace: -6 }, tag: 'ok', requiresCash: 60_000 },
                { label: 'Take a 60,000 personal loan at 14 percent', outcome: 'An EMI of about 5,400 for twelve months, and a loan on file. Manageable, and a year of it.', effect: { debt: 60_000, monthly: { label: 'Personal loan EMI', amount: 5_400 }, credit: 3, peace: -10 }, tag: 'ok' },
                { label: 'Put it on the credit card', outcome: 'Sixty thousand at 3.5 percent a month is 2,100 of interest in the first month alone. The worst-priced money you have access to.', effect: { debt: 60_000, credit: -8, peace: -12 }, tag: 'costly', requiresFlag: 'hasCard' },
            ],
        },
        {
            id: 'proofs', month: 10,
            title: 'Payroll wants proofs',
            body: 'The 80C you declared in month five was never invested. Payroll needs receipts by the 15th or recovers the tax from the remaining payslips.',
            showIfFlag: 'oldNoProof',
            options: [
                { label: 'Admit it, let them recover the tax', outcome: 'About 12,000 comes out of the next two payslips. Annoying, correct, and over.', effect: { cash: -12_000, peace: -4 }, tag: 'ok' },
                { label: 'Rush 1.5 lakh into a tax-saver you do not understand', outcome: 'You lock 1.5 lakh for three years, at the worst time of year, in a product chosen in a hurry. The tax saved is real; so is the lock-in.', effect: { investOnce: 150_000, peace: -8 }, tag: 'costly', requiresCash: 150_000 },
                { label: 'Submit a receipt a friend "arranged"', outcome: 'A forged proof is fraud, it is on your permanent tax record, and the AIS cross-check that catches it is automated now.', effect: { peace: -20, credit: -10 }, tag: 'costly' },
            ],
        },
        {
            id: 'hike', month: 10,
            title: 'A 10 percent hike',
            body: 'Appraisal done. In-hand goes up by 4,500 a month from now.',
            hideIfFlag: 'oldNoProof',
            options: [
                { label: 'Put the whole hike into the SIP', outcome: 'You never had this money, so you do not miss it. This one move is how a salary turns into wealth.', effect: { monthly: { label: 'Hike', amount: -4_500 }, invest: 4_500, peace: 2 }, tag: 'wise' },
                { label: 'Move to a nicer flat for 4,500 more', outcome: 'Lifestyle rises to meet income. Nothing wrong with it, but the hike is gone before it arrived.', effect: { monthly: { label: 'Hike', amount: -4_500 }, peace: 3, setFlag: 'upgraded' }, tag: 'ok' },
                { label: 'Let it sit in the account', outcome: 'Cash builds, which is not nothing, and inflation quietly takes 5 to 6 percent of it a year.', effect: { monthly: { label: 'Hike', amount: -4_500 }, peace: 1 }, tag: 'ok' },
            ],
        },
        {
            id: 'wedding', month: 11,
            title: 'Cousin\'s wedding',
            body: 'Three days in another city. Gift, outfit, travel: about 13,000 done properly.',
            options: [
                { label: 'Do it properly, from cash', outcome: 'A wedding is a place money is supposed to go. It was there.', effect: { cash: -13_000, peace: 6 }, tag: 'ok', requiresCash: 13_000 },
                { label: 'Gift and travel only, wear what you have', outcome: 'Nobody remembered the outfit. Eight thousand stayed put.', effect: { cash: -5_000, peace: 3 }, tag: 'wise' },
                { label: 'Outfit on three-month BNPL', outcome: 'A wedding outfit on a loan with a due date. The instalments outlive the photos.', effect: { cash: -5_000, monthly: { label: 'BNPL outfit', amount: 2_700 }, credit: -1, peace: -2 }, tag: 'costly' },
            ],
        },
        {
            id: 'bonus', month: 12,
            title: 'A 30,000 bonus',
            body: 'Year-end. Thirty thousand lands, over and above salary.',
            options: [
                { label: 'Clear whatever is owed first, invest the rest', outcome: 'Debt at 3.5 percent a month is the best investment you will ever pay off. Whatever is left stays in the account for next year.', effect: { cash: 30_000, payDebt: 30_000, peace: 8 }, tag: 'wise' },
                { label: 'Straight into the investment account', outcome: 'A lump sum on top of the SIP. If nothing was owed, this is the best choice on the list.', effect: { cash: 30_000, investOnce: 30_000, peace: 4 }, tag: 'wise' },
                { label: 'A trip, you earned it', outcome: 'You did. It is also the whole bonus, and next year starts where this one did.', effect: { cash: 0, peace: 6 }, tag: 'ok' },
            ],
        },
    ],
};
