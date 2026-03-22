export interface MarketIndex {
    name: string;
    value: number;
    change: number;
    sparkline: number[];
}

export interface EITMCardData {
    id: string;
    trigger: 'market_event' | 'transaction_spike' | 'policy';
    headline: string;
    explanation: string;
    personalImpact: {
        holding: string;
        change: string;
    };
    learnMoreLink: string;
}

export interface Transaction {
    id: string;
    amount: number;
    type: 'debit' | 'credit';
    category: string;
    merchant: string;
    date: string;
    source: 'auto' | 'manual';
    notes?: string;
}

export interface CategorySpending {
    name: string;
    amount: number;
    percentage: number;
    icon: string;
}

export interface Budget {
    category: string;
    monthlyLimit: number;
    currentSpend: number;
    icon: string;
}

export interface Module {
    id: string;
    title: string;
    description: string;
    duration: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    keyPoints: string[];
    content: string;
    completed: boolean;
}

export interface LearningPath {
    id: string;
    title: string;
    description: string;
    overview: string;
    progress: { completed: number; total: number };
    nextModule: string;
    badgeEarned: boolean;
    modules: Module[];
}

export interface GlossaryTerm {
    term: string;
    definition: string;
}

export const MOCK_MARKET_DATA: MarketIndex[] = [
    {
        name: 'NIFTY 50',
        value: 22145,
        change: 0.85,
        sparkline: [21800, 21920, 22050, 21980, 22100, 22200, 22145],
    },
    {
        name: 'SENSEX',
        value: 73298,
        change: -0.12,
        sparkline: [73500, 73400, 73350, 73200, 73100, 73250, 73298],
    },
    {
        name: 'GOLD (₹/10g)',
        value: 64850,
        change: 1.23,
        sparkline: [63800, 64000, 64200, 64100, 64500, 64700, 64850],
    },
    {
        name: 'USD/INR',
        value: 83.12,
        change: -0.05,
        sparkline: [83.25, 83.20, 83.18, 83.15, 83.10, 83.08, 83.12],
    },
];

export const MOCK_EITM_CARDS: EITMCardData[] = [
    {
        id: 'eitm_1',
        trigger: 'market_event',
        headline: 'Why did gold prices jump 4% today?',
        explanation:
            'Gold prices surged because the US Federal Reserve hinted at cutting interest rates. Jab rates kam hote hain, gold becomes more attractive kyunki it doesn\'t pay interest anyway. Think of it like this: if your savings account gives less interest, you might prefer buying gold instead. Global uncertainty bhi gold demand push karti hai.',
        personalImpact: {
            holding: 'Gold ETF',
            change: '+₹340',
        },
        learnMoreLink: '/learning-hub/gold-101',
    },
    {
        id: 'eitm_2',
        trigger: 'transaction_spike',
        headline: 'Your dining spending is 40% above usual 🍽️',
        explanation:
            'Iss hafte aapne 5 baar food delivery order kiya — usually aap sirf 3 baar karte ho. Ye monthly dining budget ka 80% already use ho gaya hai. Ek simple trick: hafte mein 2 din ghar pe khana banao, ₹2,000+ save ho sakta hai.',
        personalImpact: {
            holding: 'Dining Budget',
            change: '-₹2,100 over usual',
        },
        learnMoreLink: '/learning-hub/budgeting-basics',
    },
    {
        id: 'eitm_3',
        trigger: 'policy',
        headline: 'RBI kept repo rate unchanged — what does this mean?',
        explanation:
            'RBI ne interest rate 6.5% pe hi rakha hai. Iska matlab aapki EMI same rahegi for now. Repo rate is like the "wholesale price" of money — jab RBI isse change karta hai, banks accordingly apne loan rates adjust karte hain. Filhaal, stable hai toh relax karo!',
        personalImpact: {
            holding: 'Home Loan EMI',
            change: 'No change — ₹18,500/month',
        },
        learnMoreLink: '/learning-hub/rbi-policy',
    },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
    {
        id: 'txn_1',
        amount: 450,
        type: 'debit',
        category: 'dining',
        merchant: 'Swiggy',
        date: '2026-02-12T14:30:00Z',
        source: 'auto',
    },
    {
        id: 'txn_2',
        amount: 180,
        type: 'debit',
        category: 'transport',
        merchant: 'Uber',
        date: '2026-02-12T08:15:00Z',
        source: 'auto',
    },
    {
        id: 'txn_3',
        amount: 320,
        type: 'debit',
        category: 'dining',
        merchant: 'Starbucks',
        date: '2026-02-11T17:45:00Z',
        source: 'auto',
    },
    {
        id: 'txn_4',
        amount: 1299,
        type: 'debit',
        category: 'shopping',
        merchant: 'Amazon',
        date: '2026-02-11T22:10:00Z',
        source: 'auto',
    },
    {
        id: 'txn_5',
        amount: 85000,
        type: 'credit',
        category: 'investments',
        merchant: 'Salary Credit',
        date: '2026-02-01T10:00:00Z',
        source: 'auto',
    },
    {
        id: 'txn_6',
        amount: 249,
        type: 'debit',
        category: 'groceries',
        merchant: 'Blinkit',
        date: '2026-02-10T19:20:00Z',
        source: 'auto',
    },
    {
        id: 'txn_7',
        amount: 599,
        type: 'debit',
        category: 'entertainment',
        merchant: 'Netflix',
        date: '2026-02-05T00:00:00Z',
        source: 'auto',
    },
    {
        id: 'txn_8',
        amount: 2500,
        type: 'debit',
        category: 'utilities',
        merchant: 'Jio Postpaid',
        date: '2026-02-03T12:00:00Z',
        source: 'manual',
    },
    {
        id: 'txn_9',
        amount: 780,
        type: 'debit',
        category: 'dining',
        merchant: 'Zomato',
        date: '2026-02-09T13:30:00Z',
        source: 'auto',
    },
    {
        id: 'txn_10',
        amount: 5000,
        type: 'debit',
        category: 'investments',
        merchant: 'Groww SIP',
        date: '2026-02-01T09:00:00Z',
        source: 'auto',
    },
];

export const MOCK_CATEGORY_SPENDING: CategorySpending[] = [
    { name: 'Dining', amount: 3200, percentage: 21, icon: '🍽️' },
    { name: 'Shopping', amount: 2800, percentage: 18, icon: '🛍️' },
    { name: 'Transport', amount: 1500, percentage: 10, icon: '🚗' },
    { name: 'Groceries', amount: 1200, percentage: 8, icon: '🛒' },
    { name: 'Utilities', amount: 2500, percentage: 16, icon: '⚡' },
    { name: 'Entertainment', amount: 1040, percentage: 7, icon: '🎬' },
];

export const MOCK_BUDGETS: Budget[] = [
    { category: 'Dining', monthlyLimit: 4000, currentSpend: 3200, icon: '🍽️' },
    { category: 'Shopping', monthlyLimit: 5000, currentSpend: 2800, icon: '🛍️' },
    { category: 'Transport', monthlyLimit: 3000, currentSpend: 1500, icon: '🚗' },
    { category: 'Groceries', monthlyLimit: 3000, currentSpend: 1200, icon: '🛒' },
    { category: 'Utilities', monthlyLimit: 3000, currentSpend: 2500, icon: '⚡' },
    { category: 'Entertainment', monthlyLimit: 2000, currentSpend: 1040, icon: '🎬' },
];

export const MOCK_LEARNING_PATHS: LearningPath[] = [
    {
        id: 'investing101',
        title: 'Investing 101',
        description: 'Learn the basics of stock market investing — from stocks to SIPs',
        overview: 'Master the fundamentals of Indian stock market investing. This 8-module course covers everything from understanding how stocks work to building your first SIP. Perfect for beginners who want to start their investment journey.',
        progress: { completed: 3, total: 8 },
        nextModule: 'Mutual Funds Explained',
        badgeEarned: false,
        modules: [
            {
                id: 'mod_1',
                title: 'What is the Stock Market?',
                description: 'Understand how NSE and BSE work',
                duration: '10 mins',
                difficulty: 'beginner',
                completed: true,
                keyPoints: [
                    'NSE (National Stock Exchange) is where companies list shares',
                    'BSE (Bombay Stock Exchange) is the older exchange',
                    'When you buy a stock, you own a piece of that company',
                    'Stock prices change based on supply & demand',
                ],
                content: 'The stock market is where stocks (shares) of companies are bought and sold. In India, we have two main exchanges: NSE and BSE. When a company goes public (IPO), ordinary people like you can buy its shares. If the company does well, the stock price goes up, and your investment grows. If it struggles, the price may fall. That\'s why it\'s called "risk & reward."',
            },
            {
                id: 'mod_2',
                title: 'Stocks vs Mutual Funds',
                description: 'Key differences explained',
                duration: '8 mins',
                difficulty: 'beginner',
                completed: true,
                keyPoints: [
                    'Stocks = Direct ownership of a company',
                    'Mutual Funds = Pooled money managed by professionals',
                    'Stocks require research; MFs are passive',
                    'MFs reduce individual stock risk through diversification',
                ],
                content: 'A stock is a direct share in a company. If you buy 1 share of Reliance, you own a tiny piece of Reliance. A mutual fund is different — it\'s money pooled from many investors, professionally managed, and invested in many stocks. Think of stocks as buying individual houses, and mutual funds as buying a residential complex where you own 1 flat among hundreds. Mutual funds are less risky because they spread money across many stocks.',
            },
            {
                id: 'mod_3',
                title: 'What is a Mutual Fund?',
                description: 'Understanding pooled investments',
                duration: '9 mins',
                difficulty: 'beginner',
                completed: true,
                keyPoints: [
                    'MF pools money from thousands of investors',
                    'A fund manager invests this pooled money',
                    'You buy "units" priced at that day\'s NAV',
                    'Dividends and growth are shared proportionally',
                ],
                content: 'Mutual funds are like investment clubs. Thousands of people (like you) give money to a fund manager. The manager then invests all this pooled money in stocks, bonds, or other securities. The cost of each unit is called NAV (Net Asset Value). If the fund earns 10% in a year, your value goes up by 10%. No research needed on your part!',
            },
            {
                id: 'mod_4',
                title: 'Types of Mutual Funds',
                description: 'Equity, Debt, Balanced, Liquid',
                duration: '11 mins',
                difficulty: 'intermediate',
                completed: false,
                keyPoints: [
                    'Equity MFs invest in stocks (high growth, high risk)',
                    'Debt MFs invest in bonds (low risk, stable returns)',
                    'Balanced MFs mix both (moderate risk & return)',
                    'Liquid MFs are for emergency money (very safe)',
                ],
                content: 'There are 4 main types: (1) Equity MFs invest 100% in stocks — high growth but volatile. (2) Debt MFs invest in government bonds & corporate debt — safer, ~5-7% returns. (3) Balanced MFs mix both — good for medium-risk investors. (4) Liquid MFs are for money you might need soon, like an emergency fund. Choose based on your time horizon and risk appetite.',
            },
            {
                id: 'mod_5',
                title: 'What is a SIP?',
                description: 'Systematic Investment Plan explained',
                duration: '10 mins',
                difficulty: 'intermediate',
                completed: false,
                keyPoints: [
                    'SIP = Investing a fixed amount monthly',
                    'Example: ₹5,000 every month into an equity fund',
                    'Benefits from rupee cost averaging (buy low, buy high)',
                    'Removes emotion from investing',
                ],
                content: 'SIP (Systematic Investment Plan) is the best way to start investing. Instead of investing ₹60,000 once, you invest ₹5,000 every month for 12 months. Why? Because markets go up and down. When prices are low, your ₹5,000 buys more units. When high, it buys fewer units. Over time, you average out the cost and reduce risk. It\'s like a recurring deposit, but for mutual funds.',
            },
            {
                id: 'mod_6',
                title: 'How to Start Investing',
                description: 'Step-by-step guide to your first investment',
                duration: '12 mins',
                difficulty: 'intermediate',
                completed: false,
                keyPoints: [
                    'Use apps like Groww, ICICI Securities, or HDFC Sky',
                    'Complete KYC (Know Your Customer) verification',
                    'Choose a fund based on your risk appetite',
                    'Start a SIP in 10 minutes from your phone',
                ],
                content: 'Modern investing is easy! Download an investing app (Groww is popular). Complete your KYC using Aadhaar & PAN. Browse funds by category (Equity, Debt, etc.). Read the fund\'s expense ratio & historical returns. If it fits your risk profile, start a SIP. Money will auto-debit from your bank account every month. You can track growth in your dashboard anytime.',
            },
            {
                id: 'mod_7',
                title: 'Common Investment Mistakes',
                description: 'What NOT to do as a new investor',
                duration: '8 mins',
                difficulty: 'intermediate',
                completed: false,
                keyPoints: [
                    'Don\'t panic-sell during market downturns',
                    'Don\'t chase performance (fund that was #1 last year may not be today)',
                    'Don\'t invest money you\'ll need in 1-2 years',
                    'Don\'t compare your returns to your friend\'s returns',
                ],
                content: 'New investors often panic when markets drop 20%. Stop! Long-term investors should smile — lower prices mean buying more units at cheaper rates. Don\'t chase "hot" funds. Don\'t invest short-term money in stocks. Don\'t check your portfolio daily — you\'ll stress yourself. Markets go up 80% of the time over 5+ year periods. Stay calm & stay invested.',
            },
            {
                id: 'mod_8',
                title: 'Building a Portfolio',
                description: 'Diversification strategy for beginners',
                duration: '10 mins',
                difficulty: 'advanced',
                completed: false,
                keyPoints: [
                    'Start with 1 broad-based equity fund (like Nifty 50 index)',
                    'Add 1 debt fund for stability',
                    'Consider your age: younger = more equity',
                    'Rebalance once a year',
                ],
                content: 'A simple beginner portfolio: (1) 70% Equity — diversified large-cap + mid-cap funds. (2) 20% Debt — short-term bond fund. (3) 10% Gold — hedge against inflation. As you age, shift allocation from equity to debt. At 25, you can do 90% equity. At 40, maybe 70% equity, 30% debt. Rebalance yearly to maintain your target allocation. This framework works for years.',
            },
        ],
    },
    {
        id: 'budgetBasics',
        title: 'Budgeting Basics',
        description: 'Master the 50-30-20 rule, build an emergency fund, and manage debt',
        overview: 'Learn to control your money before your money controls you. This 5-module masterclass teaches the proven 50-30-20 budgeting framework, how to build your emergency fund, and strategies to eliminate debt. You\'ll graduate with a budget you can actually stick to.',
        progress: { completed: 5, total: 5 },
        nextModule: 'Completed!',
        badgeEarned: true,
        modules: [
            {
                id: 'mod_b1',
                title: 'Why Budgeting Matters',
                description: 'The foundation of financial wellness',
                duration: '7 mins',
                difficulty: 'beginner',
                completed: true,
                keyPoints: [
                    'Budgeting is NOT about limiting spending',
                    'It\'s about spending INTENTIONALLY',
                    'Most people don\'t know where their money goes',
                    '78% of Indians say they live paycheck to paycheck',
                ],
                content: 'A budget is simply a plan for your money. It\'s not restrictive — it\'s empowering. When you know where every rupee goes, you can make conscious choices. "Do I really want to spend ₹5,000/month on food delivery?" When you see the number, decisions change. Studies show budgeters save 15-20% more than non-budgeters. You don\'t need a fancy app; pen & paper works.',
            },
            {
                id: 'mod_b2',
                title: 'The 50-30-20 Rule',
                description: 'The golden budget framework',
                duration: '9 mins',
                difficulty: 'beginner',
                completed: true,
                keyPoints: [
                    '50% for Needs (rent, food, utilities)',
                    '30% for Wants (entertainment, dining out)',
                    '20% for Savings & Debt (emergency fund, investments)',
                    'Adjust percentages based on your situation',
                ],
                content: 'If you earn ₹100,000/month: 50% (₹50k) for essentials like rent & groceries. 30% (₹30k) for fun — dining, movies, hobbies. 20% (₹20k) for savings & debt repayment. This doesn\'t have to be exact. If you live in expensive cities, rent might be 50% alone. Then 50% need, 35% want, 15% save. The point isn\'t the numbers — it\'s the principle of intentional spending.',
            },
            {
                id: 'mod_b3',
                title: 'Building an Emergency Fund',
                description: 'Your financial safety net',
                duration: '10 mins',
                difficulty: 'beginner',
                completed: true,
                keyPoints: [
                    'Goal: 3-6 months of living expenses',
                    'Keep it in a separate, liquid account',
                    'Calculate your monthly need (rent, food, utilities)',
                    'Build it gradually — even ₹1,000/month helps',
                ],
                content: 'An emergency fund is money for unexpected events: job loss, medical emergency, car repair. Without it, you\'ll go into debt. Ideal size: 6 months of expenses (some say 3 months minimum). Calculate: Monthly Needs = Rent + Food + Utilities + Phone + Insurance. Multiply by 6. That\'s your target. Don\'t have ₹2L? Start with ₹50k. Build it over time. Keep it in a savings account earning 6-7% interest (HDFC Bank, ICICI, Axis offer good rates). NOT in investments — must be liquid.',
            },
            {
                id: 'mod_b4',
                title: 'Debt Management',
                description: 'Credit cards, loans, and how to escape them',
                duration: '11 mins',
                difficulty: 'intermediate',
                completed: true,
                keyPoints: [
                    'Credit card is a tool, not free money',
                    'Interest rates on credit card debt: 36-48% p.a.',
                    'Always pay full balance to avoid interest',
                    'Debt repayment strategy: Avalanche vs Snowball',
                ],
                content: 'Credit cards are dangerous if misused. Interest at 45% per annum means ₹10,000 debt becomes ₹14,500 in a year if unpaid. ALWAYS pay the full bill by the due date. If you have multiple debts: Avalanche method = pay highest interest first. Snowball method = pay smallest balance first (feels faster). Choose what keeps you motivated. Personal loans (10-15% interest) are cheaper than credit cards. Car loans (8-12%) are cheaper still. Minimize debt; maximize savings.',
            },
            {
                id: 'mod_b5',
                title: 'Creating Your Budget',
                description: 'Build a budget in 30 minutes',
                duration: '12 mins',
                difficulty: 'intermediate',
                completed: true,
                keyPoints: [
                    'List ALL monthly income sources',
                    'List all expenses (use credit card statements)',
                    'Apply 50-30-20 rule',
                    'Find leaks (small subscriptions add up)',
                    'Review monthly & adjust',
                ],
                content: 'Step 1: Open a spreadsheet. List income (salary, freelance, etc.). Step 2: List expenses from last 3 months (credit card bill, UPI transactions). Categorize: Rent, Food, Transport, Subscriptions, Dining, Clothes, etc. Step 3: Calculate percentages. If Dining = ₹8k and income = ₹100k, that\'s 8% (good). If = ₹15k, that\'s 15% (too high for "wants"). Step 4: Adjust. Cut Netflix & save ₹500/month? That\'s ₹6k/year. Step 5: Use this budget as your spending plan. Track actual vs planned every week.',
            },
        ],
    },
    {
        id: 'taxSimplified',
        title: 'Tax Simplified',
        description: 'Decode ITR filing, Section 80C/80D, and capital gains tax',
        overview: 'Taxes confuse everyone. This 6-module course demystifies Indian income tax: how to file ITR, save tax smartly with deductions, understand capital gains, and avoid penalties. You\'ll discover that taxes aren\'t boring — they\'re an opportunity to save thousands.',
        progress: { completed: 0, total: 6 },
        nextModule: 'What is Income Tax?',
        badgeEarned: false,
        modules: [
            {
                id: 'mod_t1',
                title: 'What is Income Tax?',
                description: 'The basics every Indian should know',
                duration: '8 mins',
                difficulty: 'beginner',
                completed: false,
                keyPoints: [
                    'Income tax is a tax on your earnings',
                    'Progressive tax: higher income = higher rate',
                    'Tax slabs in India: vary from 0% to 30%',
                    'Each year you must file ITR (income tax return)',
                ],
                content: 'Income earned in India is taxed by the government. Salary, business profit, rental income, investment income — all taxed. India uses a "progressive" system: earn ₹2.5L/year, zero tax. Earn ₹10L, you pay 20-30% on amount above ₹7.5L (not on entire ₹10L). This year\'s slab (2025-26): ₹0-2.5L = 0%, ₹2.5-5L = 5%, ₹5-10L = 20%, ₹10L+ = 30%. You must file ITR every year if income exceeds ₹2.5L.',
            },
            {
                id: 'mod_t2',
                title: 'Tax Deductions (Section 80C)',
                description: 'Smart ways to save tax',
                duration: '10 mins',
                difficulty: 'beginner',
                completed: false,
                keyPoints: [
                    'Section 80C allows ₹1.5L deduction per year',
                    'ELSS (Equity Linked Savings Scheme) = ₹1.5L',
                    'PPF (Public Provident Fund) = ₹1.5L',
                    'Life Insurance Premiums = ₹1.5L',
                    'Home Loan Principal Repayment = ₹1.5L',
                ],
                content: 'Section 80C lets you reduce taxable income by up to ₹1.5L per year. Invest ₹1.5L in ELSS mutual funds? Taxable income drops by ₹1.5L. For ₹30% tax slab, that\'s ₹45,000 tax saved! Common 80C investments: (1) ELSS = mutual funds with 3-year lock-in, ~12-15% returns. (2) PPF = government savings scheme, 7-8% returns, 15-year term. (3) NSCs, FDs, Insurance premiums qualify too. Example: If you earn ₹10L and invest ₹1.5L via ELSS, you pay tax on ₹8.5L instead of ₹10L.',
            },
            {
                id: 'mod_t3',
                title: 'Medical & Education (Section 80D)',
                description: 'Save tax on health & learning',
                duration: '9 mins',
                difficulty: 'beginner',
                completed: false,
                keyPoints: [
                    'Section 80D: Health insurance premiums deduction',
                    'Max ₹25,000 for self/family (age < 60)',
                    'Max ₹50,000 for parents (age 60+)',
                    'Section 80E: Education loan interest deduction (no limit)',
                ],
                content: 'Section 80D lets you deduct health insurance premiums. Cover yourself & family for ₹10,000/year premium? Deduct ₹10,000 from income = ₹3,000 tax saved (at 30% slab). Senior parents (60+)? Deduct ₹50,000. Section 80E: Taking education loan for yourself or kids? Deduct all interest paid (no limit, only interest, not principal). Examples: (1) Mediclaim policy ₹8k/year = ₹2,400 tax saved. (2) Education loan interest ₹50k/year = ₹15,000 tax saved. Smart saving!',
            },
            {
                id: 'mod_t4',
                title: 'Capital Gains Explained',
                description: 'Profit from stocks & property',
                duration: '11 mins',
                difficulty: 'intermediate',
                completed: false,
                keyPoints: [
                    'Capital gain = profit from selling an asset',
                    'Long-term (> 1 year) = lower tax than short-term',
                    'Equity long-term: 15% tax (below ₹1L) or 20% (above)',
                    'Real estate long-term: 20% tax',
                ],
                content: 'Buy Reliance stock at ₹2,000, sell at ₹2,500 = ₹500 profit (capital gain). Holding period matters: (1) Short-term (< 1 year): Taxed as regular income (up to 30%). (2) Long-term (> 1 year): Lower rates. Equity funds held >1 year: 15% tax if gain ≤ ₹1L, else 20%. Property held >2 years: 20% tax. This is why you hear "buy and hold" — it\'s tax-efficient. Example: Profit ₹50k from mutual fund (1-year hold) = ₹7,500 tax (15%). Same profit short-term = ₹15,000 tax (30%). Double the tax!',
            },
            {
                id: 'mod_t5',
                title: 'Filing Your ITR',
                description: 'Step-by-step guide to online ITR filing',
                duration: '13 mins',
                difficulty: 'intermediate',
                completed: false,
                keyPoints: [
                    'Deadline: July 31 each year (for March-ended FY)',
                    'File online via income-tax.gov.in',
                    'Form ITR-1 (Sahaj) for salaried individuals',
                    'Gather documents: Salary slips, bank statements, investment proof',
                ],
                content: 'ITR filing is now simple. (1) Gather documents: Form 16 from employer, bank statements, investment proofs (ELSS receipts, insurance premium bills). (2) Go to incometax.gov.in, login via Aadhaar. (3) Choose correct ITR form: ITR-1 for salaried, ITR-3 for business, ITR-4 for freelancers. (4) Enter income & deductions. (5) System auto-calculates tax. (6) E-verify using OTP. (7) Submit. If refund due, money hits bank in 15-30 days. Penalty for late filing: ₹5,000. Penalties for non-filing can be higher. File on time!',
            },
            {
                id: 'mod_t6',
                title: 'Tax Mistakes to Avoid',
                description: 'Common pitfalls and how to escape them',
                duration: '8 mins',
                difficulty: 'advanced',
                completed: false,
                keyPoints: [
                    'Don\'t underreport income (Income Tax Dept has data from banks)',
                    'Don\'t claim expenses you can\'t prove',
                    'Don\'t miss deadlines (penalties are steep)',
                    'Don\'t ignore tax notices — reply quickly',
                ],
                content: 'Biggest mistakes: (1) Hiding income. Income Tax Dept tracks bank deposits, property registrations, credit card purchases. You can\'t evade. (2) Claiming fake deductions. If audited, you must show proof. (3) Late filing after July 31 — penalty ₹5k + interest. (4) Ignoring tax notices. If IT Dept sends a notice, respond within 30 days with documents. Silence = default assessment (they calculate tax for you, often higher). (5) Not keeping records. Keep receipts, invoices, statements for 5 years. Insurance? Keep policy documents. Real estate? Keep sale deed & payment receipts.',
            },
        ],
    },
];

export const MOCK_GLOSSARY: GlossaryTerm[] = [
    { term: 'SIP', definition: 'Systematic Investment Plan — a method to invest a fixed amount regularly in mutual funds. Like a recurring deposit, but for mutual funds.' },
    { term: 'NAV', definition: 'Net Asset Value — the per-unit price of a mutual fund. It changes daily based on the fund\'s holdings.' },
    { term: 'CAGR', definition: 'Compound Annual Growth Rate — the average annual growth rate of an investment over a specified period.' },
    { term: 'Repo Rate', definition: 'The rate at which RBI lends money to commercial banks. When RBI increases it, loans become more expensive.' },
    { term: 'NIFTY 50', definition: 'An index of the top 50 companies listed on the National Stock Exchange (NSE) by market capitalization.' },
    { term: 'SENSEX', definition: 'Short for Sensitive Index — an index of the top 30 companies on the Bombay Stock Exchange (BSE).' },
    { term: 'Mutual Fund', definition: 'A pool of money collected from many investors, managed by a professional fund manager who invests in stocks, bonds, etc.' },
    { term: 'EMI', definition: 'Equated Monthly Installment — a fixed payment amount you make each month to repay a loan.' },
    { term: 'UPI', definition: 'Unified Payments Interface — India\'s instant real-time payment system used via apps like GPay, PhonePe.' },
    { term: 'ELSS', definition: 'Equity Linked Savings Scheme — a type of mutual fund that offers tax benefits under Section 80C with a 3-year lock-in.' },
    { term: 'P/E Ratio', definition: 'Price-to-Earnings Ratio — how much investors are willing to pay for ₹1 of a company\'s earnings. Higher P/E = more expensive.' },
    { term: 'Liquidity', definition: 'How quickly you can convert an asset to cash without losing value. Savings accounts are highly liquid; real estate is not.' },
    { term: 'Diversification', definition: 'Spreading investments across different assets to reduce risk. "Don\'t put all your eggs in one basket."' },
    { term: 'Bull Market', definition: 'A market where prices are rising and investor confidence is high.' },
    { term: 'Bear Market', definition: 'A market where prices are falling and investor confidence is low.' },
];

export const MOCK_WEEKLY_TREND = [1200, 1800, 2100, 1600, 2400, 3200, 2940];
