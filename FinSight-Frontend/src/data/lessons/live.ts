/**
 * Track: Live.
 *
 * The money of ordinary adult life that no course covers: a rent agreement
 * and getting the deposit back, sending money home, the wedding season,
 * and the first vehicle. Practical, Indian, and mostly about the paperwork
 * that decides whether money comes back.
 */
import type { Track } from './schema';

export const LIVE: Track = {
    id: 'live',
    title: 'Live',
    description: 'Rent agreements, money home, weddings and a first vehicle',
    audience: 'Anyone running a household, even a household of one',
    lessons: [
        {
            id: 'lv_rent',
            title: 'The rent agreement',
            summary: 'Eleven months, the deposit, and the clauses that decide if it comes back',
            minutes: 4,
            cards: [
                {
                    id: 'r1', type: 'info',
                    title: 'Why eleven months',
                    body: 'Most rent agreements run eleven months because a lease of twelve or more must be registered, with stamp duty and a visit to the sub-registrar. Eleven months keeps it a licence, renewable with a fresh document. It is still worth registering in the states that make it cheap; an unregistered agreement is weak evidence in a dispute.',
                },
                {
                    id: 'r2', type: 'spotTrap',
                    prompt: 'A draft agreement. Tap the clause that will cost you at the end.',
                    lines: [
                        { label: 'Rent', value: '15,000 a month' },
                        { label: 'Deposit', value: '45,000, refundable' },
                        { label: 'Notice period', value: 'One month, either side' },
                        { label: 'Deductions from deposit', value: 'At owner\'s discretion' },
                        { label: 'Painting charges', value: 'One month\'s rent on exit' },
                    ],
                    trap: 3,
                    explain: '"At owner\'s discretion" is a blank cheque on your 45,000. Insist on a list: unpaid rent, unpaid utilities, damage beyond normal wear, with photos at move-in attached to the agreement. Painting is at least a known number.',
                },
                {
                    id: 'r3', type: 'orderSteps',
                    prompt: 'Moving in, in the order that protects the deposit',
                    steps: [
                        'Photograph every room, meter reading and existing damage',
                        'Pay the deposit by bank transfer, never cash',
                        'Get the agreement signed with the photos as an annexure',
                        'Collect a receipt for the deposit',
                        'Set the rent as a monthly transfer with "rent" in the remark',
                    ],
                    explain: 'Photos before money, money by transfer, and a paper trail for every rupee. Each step is a minute; together they are the difference between a deposit that comes back and one you argue about.',
                },
                {
                    id: 'r4', type: 'choice',
                    prompt: 'You are leaving. The landlord says the deposit will follow "in a few weeks" after you hand over the keys. What do you do?',
                    options: ['Trust them, it is normal', 'Settle the deposit against the last month\'s rent, or hand over keys only against the refund', 'Leave the keys and follow up', 'Threaten legal action'],
                    answer: 1,
                    explain: 'Once the keys are gone, so is your leverage. Adjusting the final month against the deposit, or a simultaneous key-for-refund handover, is standard and reasonable to ask for in writing.',
                },
                {
                    id: 'r5', type: 'trueFalse',
                    statement: 'Rent receipts are needed only if you claim HRA.',
                    answer: false,
                    explain: 'They are the record that rent was paid at all, which matters in any deposit dispute. Bank transfers with a remark serve as receipts; cash rent leaves you with nothing.',
                },
            ],
        },
        {
            id: 'lv_home',
            title: 'Sending money home',
            summary: 'Gifts, loans, the tax on both, and the conversation nobody has',
            minutes: 3,
            cards: [
                {
                    id: 'h1', type: 'info',
                    title: 'The most common transfer in India',
                    body: 'Money sent to parents is a gift between relatives: no tax on either side, no limit. The complications come later: when it is a loan, when it buys an asset in someone else\'s name, or when it is the only savings you have.',
                },
                {
                    id: 'h2', type: 'trueFalse',
                    statement: 'Money you send your parents every month is tax-deductible.',
                    answer: false,
                    explain: 'It is a gift, tax-free for them and not deductible for you. There is a path that does work: a parent with low income can invest it in their own name, and the interest is taxed at their slab rather than yours. That takes a real account in their name.',
                },
                {
                    id: 'h3', type: 'choice',
                    prompt: 'Your parents want 3 lakh for a home repair and will "return it when they can". What is the best way to think about it?',
                    options: ['As a loan with interest', 'As a gift, and only give what you can afford to never see again', 'Refuse until they sign something', 'Take a personal loan and send it'],
                    answer: 1,
                    explain: 'Family loans are rarely repaid and rarely meant to be. Deciding it is a gift, and sizing it to what you can lose, keeps the relationship out of the ledger. Borrowing to give is the one option that costs you interest on a gift.',
                },
                {
                    id: 'h4', type: 'tapSort',
                    prompt: 'Whose name should it be in?',
                    buckets: ['Your name', 'Their name'],
                    items: [
                        { label: 'A fixed deposit from money you sent, for their monthly expenses', bucket: 1 },
                        { label: 'Your emergency fund', bucket: 0 },
                        { label: 'Health insurance for them', bucket: 1 },
                        { label: 'A flat you pay the EMI on', bucket: 0 },
                    ],
                    explain: 'What is for them should be theirs: it is taxed at their slab and it is theirs if anything happens to you. What you pay for and depend on should be yours; a flat in a parent\'s name that you pay for is a gift with an EMI.',
                },
                {
                    id: 'h5', type: 'choice',
                    prompt: 'Which one protects everyone in the family most, per rupee?',
                    options: ['A bigger monthly transfer', 'Health insurance for your parents, bought by you', 'Gold', 'A joint account'],
                    answer: 1,
                    explain: 'A single hospitalisation is the event that wipes out both a parent\'s savings and yours. A floater for two parents costs less than most monthly transfers, and it is the one that can stop a 5 lakh problem.',
                },
            ],
        },
        {
            id: 'lv_wedding',
            title: 'Wedding season',
            summary: 'Attending five a year, and paying for your own',
            minutes: 3,
            cards: [
                {
                    id: 'w1', type: 'info',
                    title: 'The season is a line item',
                    body: 'Between gifts, travel and clothes, attending weddings can cost a young professional a month\'s salary a year. It is predictable, it lands in the same months every year, and almost nobody budgets for it. Then a loan appears in December.',
                },
                {
                    id: 'w2', type: 'estimate',
                    prompt: 'Four weddings this season: an average of 3,000 in gifts, 4,000 in travel and one 8,000 outfit that works for all of them. Total?',
                    unit: 'inr', min: 10000, max: 60000, step: 2000,
                    answer: 36000, tolerance: 0.01,
                    explain: '12,000 in gifts, 16,000 in travel, 8,000 in clothes: 36,000. Set aside 3,000 a month from January and the season pays for itself. That is the whole trick.',
                },
                {
                    id: 'w3', type: 'choice',
                    prompt: 'Your own wedding is two years out and the family expects 15 lakh. What is the plan that does not end in a loan?',
                    options: ['A wedding loan closer to the date', 'A 30,000 a month recurring deposit or liquid fund from now, plus an honest budget conversation', 'Credit cards for the rewards', 'Hope for gifts to cover it'],
                    answer: 1,
                    explain: '30,000 a month for 24 months is 7.2 lakh plus interest, which changes the conversation from "how do we borrow" to "what does the rest need to be". A loan for a one-day event is paid off across the first years of a marriage.',
                },
                {
                    id: 'w4', type: 'trueFalse',
                    statement: 'Cash gifts received at your own wedding are taxable.',
                    answer: false,
                    explain: 'Gifts received on the occasion of marriage are exempt, from anyone, with no limit. Keep a simple list of who gave what; it is what makes a large deposit explainable if the bank or the Department asks.',
                },
                {
                    id: 'w5', type: 'spotTrap',
                    prompt: 'A venue quote. Tap the line to question first.',
                    lines: [
                        { label: 'Venue', value: '3,00,000' },
                        { label: 'Catering', value: '1,200 per plate, 400 plates' },
                        { label: 'Decor', value: '1,50,000' },
                        { label: 'Service charge', value: '10%' },
                        { label: 'Advance', value: '50%, non-refundable' },
                    ],
                    trap: 4,
                    explain: 'A 50 percent non-refundable advance on a 10 lakh event is 5 lakh at risk to a date change or a dispute. Negotiate a smaller advance with a written refund schedule; most venues will move on this before they move on price.',
                },
            ],
        },
        {
            id: 'lv_vehicle',
            title: 'The first vehicle',
            summary: 'Two-wheeler or car, on-road price, and what the EMI hides',
            minutes: 3,
            cards: [
                {
                    id: 'v1', type: 'info',
                    title: 'Ex-showroom is not the price',
                    body: 'The number in the ad is ex-showroom. Add registration, road tax, insurance and handling, and a 1 lakh two-wheeler is 1.2 lakh on the road. A car adds more. Then the vehicle costs money every month it exists: fuel, insurance renewal, service, parking, and the value it loses.',
                },
                {
                    id: 'v2', type: 'estimate',
                    prompt: 'A car with a 7 lakh ex-showroom price. Roughly what is the on-road price in a metro?',
                    unit: 'inr', min: 700000, max: 1000000, step: 10000,
                    answer: 820000, tolerance: 0.05,
                    explain: 'Around 8 to 8.5 lakh: road tax of 8 to 12 percent depending on the state, first-year insurance, registration and handling. The gap is what dealers finance for you, at interest, because most buyers have not budgeted for it.',
                },
                {
                    id: 'v3', type: 'tapSort',
                    prompt: 'One-time or every month?',
                    buckets: ['One-time', 'Every month'],
                    items: [
                        { label: 'Road tax', bucket: 0 },
                        { label: 'Fuel', bucket: 1 },
                        { label: 'Insurance', bucket: 1 },
                        { label: 'Registration', bucket: 0 },
                        { label: 'Parking', bucket: 1 },
                        { label: 'Depreciation', bucket: 1 },
                    ],
                    explain: 'Insurance renews yearly and depreciation is invisible but real: a new car loses 15 to 20 percent in its first year. A vehicle\'s true cost is the monthly column, not the sticker.',
                },
                {
                    id: 'v4', type: 'choice',
                    prompt: 'A 7-year car loan has a lower EMI than a 4-year one. What is the catch?',
                    options: ['There is none, lower is better', 'You pay far more interest, and owe more than the car is worth for years', 'The rate is higher', 'You cannot sell the car'],
                    answer: 1,
                    explain: 'Stretching the tenure lowers the EMI and raises the total interest, and because the car depreciates faster than a long loan repays, you are underwater for most of it. Keep vehicle loans short; if the short EMI does not fit, the car does not fit.',
                },
                {
                    id: 'v5', type: 'trueFalse',
                    statement: 'Third-party insurance is enough for a new vehicle.',
                    answer: false,
                    explain: 'Third-party is the legal minimum and covers only damage you cause to others. A comprehensive policy covers your own vehicle, which on a new one is the thing worth insuring. Add zero-depreciation cover for the first few years.',
                },
            ],
        },
    ],
};
