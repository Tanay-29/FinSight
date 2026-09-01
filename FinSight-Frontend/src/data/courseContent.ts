/**
 * courseContent.ts
 *
 * The FinSight curriculum: 19 modules across three learning paths, plus the
 * glossary. This is authored teaching material, not placeholder data, and it
 * is the single source for course content. It ships with the bundle rather
 * than living in Firestore, so changing a module needs an app or OTA update.
 */
export interface MarketIndex {
    name: string;
    value: number;
    change: number;
    sparkline: number[];
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
}

export interface Budget {
    category: string;
    monthlyLimit: number;
    currentSpend: number;
}

export interface QuizQuestion {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
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
    quiz: QuizQuestion[];
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






export const COURSE_CONTENT: LearningPath[] = [
    {
        id: 'investing101',
        title: 'Investing 101',
        description: 'Learn the basics of stock market investing, from stocks to SIPs',
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
                completed: false,
                keyPoints: [
                    'NSE (National Stock Exchange) is where companies list shares',
                    'BSE (Bombay Stock Exchange) is the older exchange',
                    'When you buy a stock, you own a piece of that company',
                    'Stock prices change based on supply & demand',
                ],
                content: 'The stock market is where stocks (shares) of companies are bought and sold. In India, we have two main exchanges: NSE and BSE. When a company goes public (IPO), ordinary people like you can buy its shares. If the company does well, the stock price goes up, and your investment grows. If it struggles, the price may fall. That\'s why it\'s called "risk & reward."',
                quiz: [
                    {
                        question: 'What does it mean to "own a stock"?',
                        options: ['You lend money to a company', 'You own a small piece of that company', 'You guarantee the company\'s profits', 'You become a company director'],
                        answerIndex: 1,
                        explanation: 'A stock represents partial ownership. If you own 100 shares of a company with 1 million shares total, you own 0.01% of it.',
                    },
                    {
                        question: 'Which is the OLDER stock exchange in India?',
                        options: ['NSE (National Stock Exchange)', 'BSE (Bombay Stock Exchange)', 'MCX (Multi Commodity Exchange)', 'NCDEX'],
                        answerIndex: 1,
                        explanation: 'BSE, established in 1875, is Asia\'s oldest stock exchange. NSE was established in 1992.',
                    },
                    {
                        question: 'What primarily drives stock prices up or down?',
                        options: ['Company logo and branding', 'Supply & demand from buyers and sellers', 'Government mandates', 'The company\'s age'],
                        answerIndex: 1,
                        explanation: 'Stock prices fluctuate based on how many people want to buy (demand) versus sell (supply). Company performance, news, and sentiment all influence this.',
                    },
                ],
            },
            {
                id: 'mod_2',
                title: 'Stocks vs Mutual Funds',
                description: 'Key differences explained',
                duration: '8 mins',
                difficulty: 'beginner',
                completed: false,
                keyPoints: [
                    'Stocks = Direct ownership of a company',
                    'Mutual Funds = Pooled money managed by professionals',
                    'Stocks require research; MFs are passive',
                    'MFs reduce individual stock risk through diversification',
                ],
                content: 'A stock is a direct share in a company. If you buy 1 share of Reliance, you own a tiny piece of Reliance. A mutual fund is different; it\'s money pooled from many investors, professionally managed, and invested in many stocks. Think of stocks as buying individual houses, and mutual funds as buying a residential complex where you own 1 flat among hundreds. Mutual funds are less risky because they spread money across many stocks.',
                quiz: [
                    {
                        question: 'What is the biggest advantage of a Mutual Fund over direct stocks?',
                        options: ['Guaranteed returns', 'Diversification reduces individual stock risk', 'No fees whatsoever', 'Always outperforms the index'],
                        answerIndex: 1,
                        explanation: 'Mutual funds spread money across many stocks. If one company crashes, it only affects a small portion of your investment.',
                    },
                    {
                        question: 'Who manages the investments in a Mutual Fund?',
                        options: ['You (the investor)', 'SEBI regulator', 'A professional fund manager', 'The RBI'],
                        answerIndex: 2,
                        explanation: 'A professional fund manager makes investment decisions on behalf of all investors in the fund, using their expertise and research.',
                    },
                    {
                        question: 'Buying a stock directly is analogous to:',
                        options: ['Buying a flat in a large complex', 'Buying an entire individual house', 'Renting a property', 'Taking a bank loan'],
                        answerIndex: 1,
                        explanation: 'Owning a stock means you directly own a slice of one specific company, like owning a standalone house rather than a flat in a complex.',
                    },
                ],
            },
            {
                id: 'mod_3',
                title: 'What is a Mutual Fund?',
                description: 'Understanding pooled investments',
                duration: '9 mins',
                difficulty: 'beginner',
                completed: false,
                keyPoints: [
                    'MF pools money from thousands of investors',
                    'A fund manager invests this pooled money',
                    'You buy "units" priced at that day\'s NAV',
                    'Dividends and growth are shared proportionally',
                ],
                content: 'Mutual funds are like investment clubs. Thousands of people (like you) give money to a fund manager. The manager then invests all this pooled money in stocks, bonds, or other securities. The cost of each unit is called NAV (Net Asset Value). If the fund earns 10% in a year, your value goes up by 10%. No research needed on your part!',
                quiz: [
                    {
                        question: 'What does NAV stand for in mutual funds?',
                        options: ['National Asset Value', 'Net Asset Value', 'New Annual Value', 'Nominal Asset Volume'],
                        answerIndex: 1,
                        explanation: 'NAV (Net Asset Value) is the per-unit price of a mutual fund. It\'s calculated daily based on the total value of all assets minus liabilities, divided by total units.',
                    },
                    {
                        question: 'If a mutual fund earns 12% in a year, what happens to your investment?',
                        options: ['It stays the same', 'You get a fixed ₹12,000 regardless of investment', 'Your investment also grows by approximately 12%', 'You pay 12% as tax'],
                        answerIndex: 2,
                        explanation: 'Mutual fund returns are proportional. If the fund grows 12%, your investment grows by 12% too, proportional to the units you hold.',
                    },
                    {
                        question: 'What do you receive when you invest in a mutual fund?',
                        options: ['Physical gold certificates', 'Fund units at the current NAV price', 'Shares of one specific company', 'A fixed interest rate guarantee'],
                        answerIndex: 1,
                        explanation: 'You buy "units" of the fund. The number of units depends on how much you invest divided by that day\'s NAV price.',
                    },
                ],
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
                content: 'There are 4 main types: (1) Equity MFs invest 100% in stocks, high growth but volatile. (2) Debt MFs invest in government bonds & corporate debt, safer, ~5-7% returns. (3) Balanced MFs mix both, good for medium-risk investors. (4) Liquid MFs are for money you might need soon, like an emergency fund. Choose based on your time horizon and risk appetite.',
                quiz: [
                    {
                        question: 'Which type of mutual fund is MOST suitable for an emergency fund?',
                        options: ['Equity Fund', 'Balanced Fund', 'Liquid Fund', 'ELSS Fund'],
                        answerIndex: 2,
                        explanation: 'Liquid funds invest in very short-term instruments and can be redeemed within 1 business day, perfect for emergency money that must be accessible quickly.',
                    },
                    {
                        question: 'Equity mutual funds primarily invest in:',
                        options: ['Government bonds', 'Real estate', 'Stocks of companies', 'Fixed deposits'],
                        answerIndex: 2,
                        explanation: 'Equity mutual funds invest at least 65% of their corpus in stocks (equities). This gives high return potential but with higher short-term volatility.',
                    },
                    {
                        question: 'A Balanced or Hybrid Fund is best described as:',
                        options: ['100% stocks only', 'A mix of equity and debt', 'Only government bonds', 'A savings account'],
                        answerIndex: 1,
                        explanation: 'Balanced/Hybrid funds split money between stocks (for growth) and bonds (for stability), giving moderate risk and returns.',
                    },
                ],
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
                quiz: [
                    {
                        question: 'What is "Rupee Cost Averaging" in a SIP?',
                        options: ['You always buy at the lowest price', 'You invest a fixed sum, buying more units when prices are low and fewer when high', 'You only invest when markets are falling', 'You double your investment monthly'],
                        answerIndex: 1,
                        explanation: 'With regular fixed investments, you automatically buy more units when prices are low and fewer when prices are high, averaging out your cost over time.',
                    },
                    {
                        question: 'What is a key psychological advantage of SIP?',
                        options: ['Guaranteed profits every month', 'It removes the emotion of timing the market', 'You can stop anytime with no penalty', 'It beats FD returns every single year'],
                        answerIndex: 1,
                        explanation: 'SIPs automate investing so you don\'t need to worry about whether the market is up or down. It removes emotional decision-making from investing.',
                    },
                    {
                        question: 'Which investment approach is generally safer for a first-time investor?',
                        options: ['Investing your entire savings as a lump sum in stocks', 'Starting a monthly SIP in a diversified mutual fund', 'Trading stocks every day', 'Keeping everything in cash'],
                        answerIndex: 1,
                        explanation: 'SIP spreads your investment over time, reducing the risk of investing everything at a peak. It\'s ideal for beginners.',
                    },
                ],
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
                quiz: [
                    {
                        question: 'What is KYC and why is it required before investing?',
                        options: ['A tax form for capital gains', 'Identity verification required by SEBI for all investors', 'A type of mutual fund', 'A bank transfer method'],
                        answerIndex: 1,
                        explanation: 'KYC (Know Your Customer) is a mandatory SEBI regulation to verify investor identity using Aadhaar + PAN before they can invest in mutual funds.',
                    },
                    {
                        question: 'What is an "expense ratio" in a mutual fund?',
                        options: ['The tax rate on mutual fund returns', 'The annual fee charged by the fund as a % of your investment', 'The ratio of equity to debt in the fund', 'The minimum investment amount'],
                        answerIndex: 1,
                        explanation: 'Expense ratio is the annual management fee (as a %) that the fund house charges. Lower expense ratio = more returns stay with you.',
                    },
                    {
                        question: 'Which factor should most influence your choice of mutual fund?',
                        options: ['How popular it is on social media', 'Last year\'s returns alone', 'Your risk appetite and investment time horizon', 'The fund manager\'s age'],
                        answerIndex: 2,
                        explanation: 'Your risk tolerance and time horizon are the most important factors. A 20-year-old can take more equity risk than someone investing for 2 years.',
                    },
                ],
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
                content: 'New investors often panic when markets drop 20%. Stop! Long-term investors should smile, because lower prices mean buying more units at cheaper rates. Don\'t chase "hot" funds. Don\'t invest short-term money in stocks. Don\'t check your portfolio daily; you\'ll stress yourself. Markets go up 80% of the time over 5+ year periods. Stay calm & stay invested.',
                quiz: [
                    {
                        question: 'When the market drops 20%, what should a long-term investor ideally do?',
                        options: ['Immediately sell everything', 'Stay invested or consider buying more', 'Switch to gold and FDs', 'Withdraw and wait for market recovery'],
                        answerIndex: 1,
                        explanation: 'Market dips are temporary for long-term investors. Panic-selling locks in losses. Staying invested or buying more at lower prices often leads to better outcomes.',
                    },
                    {
                        question: 'Why is it risky to invest money you\'ll need in 1-2 years in stocks?',
                        options: ['Stocks are taxed heavily short-term', 'Markets can be down when you need to withdraw', 'Stocks offer no returns under 5 years', 'SEBI prohibits short-term investing'],
                        answerIndex: 1,
                        explanation: 'Stock markets can be volatile. If your money is needed in 1-2 years, a market correction could force you to sell at a loss.',
                    },
                    {
                        question: 'Why is chasing last year\'s top-performing fund a mistake?',
                        options: ['Past performance guarantees future results', 'Top funds always stay on top', 'Past performance does NOT guarantee future results', 'All funds have identical returns over time'],
                        answerIndex: 2,
                        explanation: 'Fund performance rotates. Last year\'s winner can be this year\'s worst performer. Always evaluate based on consistency, risk-adjusted returns, and your goals.',
                    },
                ],
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
                content: 'A simple beginner portfolio: (1) 70% Equity, diversified large-cap + mid-cap funds. (2) 20% Debt, short-term bond fund. (3) 10% Gold, hedge against inflation. As you age, shift allocation from equity to debt. At 25, you can do 90% equity. At 40, maybe 70% equity, 30% debt. Rebalance yearly to maintain your target allocation. This framework works for years.',
                quiz: [
                    {
                        question: 'Why should a 25-year-old have MORE equity than a 50-year-old in their portfolio?',
                        options: ['Young people have lower tax rates', 'They have more years to recover from market downturns', 'Equity is only for young people legally', 'Debt funds are unavailable to people over 25'],
                        answerIndex: 1,
                        explanation: 'Younger investors have a longer time horizon, allowing them to ride out market volatility and benefit from compounding over decades.',
                    },
                    {
                        question: 'What does "rebalancing" a portfolio mean?',
                        options: ['Selling all investments and starting fresh', 'Adjusting your holdings periodically to restore your target allocation', 'Moving all money to the best-performing asset each year', 'Adding only equity funds every year'],
                        answerIndex: 1,
                        explanation: 'Rebalancing means restoring your original target mix (e.g., 70% equity, 20% debt, 10% gold) after market movements have shifted the proportions.',
                    },
                    {
                        question: 'Why is including a debt fund in your portfolio beneficial?',
                        options: ['It always outperforms equity', 'It provides stability and cushion when equity markets fall', 'It\'s mandatory by SEBI', 'It has no taxes'],
                        answerIndex: 1,
                        explanation: 'Debt funds invest in bonds which are less volatile than stocks. They provide stability and reduce portfolio drawdown when equity markets fall.',
                    },
                ],
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
                completed: false,
                keyPoints: [
                    'Budgeting is NOT about limiting spending',
                    'It\'s about spending INTENTIONALLY',
                    'Most people don\'t know where their money goes',
                    '78% of Indians say they live paycheck to paycheck',
                ],
                content: 'A budget is simply a plan for your money. It\'s not restrictive; it\'s empowering. When you know where every rupee goes, you can make conscious choices. "Do I really want to spend ₹5,000/month on food delivery?" When you see the number, decisions change. Studies show budgeters save 15-20% more than non-budgeters. You don\'t need a fancy app; pen & paper works.',
                quiz: [
                    {
                        question: 'What is the primary goal of budgeting?',
                        options: ['To restrict all spending', 'To spend money intentionally and consciously', 'To save 100% of income', 'To only track income, not expenses'],
                        answerIndex: 1,
                        explanation: 'Budgeting is about intention, not restriction. It helps you decide WHERE your money goes rather than wondering where it went.',
                    },
                    {
                        question: 'Studies show that people who budget save how much more than those who don\'t?',
                        options: ['1-2% more', '5-10% more', '15-20% more', '50% more'],
                        answerIndex: 2,
                        explanation: 'Research consistently shows that budgeters save 15-20% more because awareness of spending automatically changes behavior.',
                    },
                    {
                        question: 'What is the first step to building a healthy budget?',
                        options: ['Cutting all entertainment expenses immediately', 'Understanding where your money currently goes', 'Opening a new savings account', 'Calculating your tax liability'],
                        answerIndex: 1,
                        explanation: 'You can\'t improve what you don\'t measure. Tracking current spending reveals patterns and "money leaks" that you didn\'t know existed.',
                    },
                ],
            },
            {
                id: 'mod_b2',
                title: 'The 50-30-20 Rule',
                description: 'The golden budget framework',
                duration: '9 mins',
                difficulty: 'beginner',
                completed: false,
                keyPoints: [
                    '50% for Needs (rent, food, utilities)',
                    '30% for Wants (entertainment, dining out)',
                    '20% for Savings & Debt (emergency fund, investments)',
                    'Adjust percentages based on your situation',
                ],
                content: 'If you earn ₹100,000/month: 50% (₹50k) for essentials like rent & groceries. 30% (₹30k) for fun: dining, movies, hobbies. 20% (₹20k) for savings & debt repayment. This doesn\'t have to be exact. If you live in expensive cities, rent might be 50% alone. Then 50% need, 35% want, 15% save. The point isn\'t the numbers; it\'s the principle of intentional spending.',
                quiz: [
                    {
                        question: 'In the 50-30-20 rule, what does the "20" represent?',
                        options: ['Dining and entertainment', 'Rent and food', 'Savings, investments, and debt repayment', 'Government taxes'],
                        answerIndex: 2,
                        explanation: 'The 20% bucket is your wealth-building bucket: emergency fund, investments, and paying off debts faster than minimum payments.',
                    },
                    {
                        question: 'Eating out at a restaurant is classified as which category in 50-30-20?',
                        options: ['Needs (50%)', 'Wants (30%)', 'Savings (20%)', 'Debt (20%)'],
                        answerIndex: 1,
                        explanation: 'Dining out is a Want, not a Need. You can eat at home (Need) or choose to dine out (Want). Classifying correctly helps make conscious choices.',
                    },
                    {
                        question: 'If you live in Mumbai where rent alone is ₹25,000 on a ₹50,000 salary, what should you do?',
                        options: ['Strictly follow 50-30-20 and starve', 'Adjust percentages: the rule is a guideline, not law', 'Move to a cheaper city immediately', 'Stop investing entirely'],
                        answerIndex: 1,
                        explanation: 'The 50-30-20 rule is a framework, not a rigid law. Adapt it to your circumstances. High-cost-of-living cities may need a 60-20-20 or 55-25-20 split.',
                    },
                ],
            },
            {
                id: 'mod_b3',
                title: 'Building an Emergency Fund',
                description: 'Your financial safety net',
                duration: '10 mins',
                difficulty: 'beginner',
                completed: false,
                keyPoints: [
                    'Goal: 3-6 months of living expenses',
                    'Keep it in a separate, liquid account',
                    'Calculate your monthly need (rent, food, utilities)',
                    'Build it gradually, even ₹1,000/month helps',
                ],
                content: 'An emergency fund is money for unexpected events: job loss, medical emergency, car repair. Without it, you\'ll go into debt. Ideal size: 6 months of expenses (some say 3 months minimum). Calculate: Monthly Needs = Rent + Food + Utilities + Phone + Insurance. Multiply by 6. That\'s your target. Don\'t have ₹2L? Start with ₹50k. Build it over time. Keep it in a savings account earning 6-7% interest (HDFC Bank, ICICI, Axis offer good rates). NOT in investments, must be liquid.',
                quiz: [
                    {
                        question: 'Why should an emergency fund NOT be kept in stock market investments?',
                        options: ['Equity returns are too high', 'You might need the money quickly and markets could be down', 'SEBI prohibits it', 'Stocks don\'t pay interest'],
                        answerIndex: 1,
                        explanation: 'Emergency funds must be easily accessible. If the market is down when an emergency strikes and you\'re forced to sell, you\'ll lock in losses.',
                    },
                    {
                        question: 'What is the recommended size of an emergency fund?',
                        options: ['₹10,000 flat', '1 month of salary', '3-6 months of living expenses', '1 year of gross income'],
                        answerIndex: 2,
                        explanation: '3-6 months of expenses covers most emergencies (job loss, medical, repairs). Calculate your monthly essential expenses, not your salary.',
                    },
                    {
                        question: 'You have zero emergency fund savings. What is the best first move?',
                        options: ['Invest in equity mutual funds first', 'Start saving even ₹1,000/month into a separate savings account', 'Take a personal loan for the emergency fund', 'Wait until salary increases'],
                        answerIndex: 1,
                        explanation: 'Starting small is better than not starting. Even ₹1,000/month adds up to ₹12,000 in a year. Momentum and habit matter more than the initial amount.',
                    },
                ],
            },
            {
                id: 'mod_b4',
                title: 'Debt Management',
                description: 'Credit cards, loans, and how to escape them',
                duration: '11 mins',
                difficulty: 'intermediate',
                completed: false,
                keyPoints: [
                    'Credit card is a tool, not free money',
                    'Interest rates on credit card debt: 36-48% p.a.',
                    'Always pay full balance to avoid interest',
                    'Debt repayment strategy: Avalanche vs Snowball',
                ],
                content: 'Credit cards are dangerous if misused. Interest at 45% per annum means ₹10,000 debt becomes ₹14,500 in a year if unpaid. ALWAYS pay the full bill by the due date. If you have multiple debts: Avalanche method = pay highest interest first. Snowball method = pay smallest balance first (feels faster). Choose what keeps you motivated. Personal loans (10-15% interest) are cheaper than credit cards. Car loans (8-12%) are cheaper still. Minimize debt; maximize savings.',
                quiz: [
                    {
                        question: 'What is the approximate annual interest rate on unpaid credit card debt in India?',
                        options: ['5-8% per year', '12-15% per year', '36-48% per year', '1-2% per year'],
                        answerIndex: 2,
                        explanation: 'Credit card interest in India is typically 3-4% per MONTH, which compounds to 36-48% per year. It is one of the most expensive forms of debt.',
                    },
                    {
                        question: 'In the "Avalanche" debt repayment method, you pay off debts in which order?',
                        options: ['Smallest balance first', 'Oldest debt first', 'Highest interest rate first', 'Largest balance first'],
                        answerIndex: 2,
                        explanation: 'Avalanche = pay minimums on all debts, then put all extra money toward the highest interest rate debt first. This saves the most money on interest.',
                    },
                    {
                        question: 'You have ₹10,000 in credit card debt and paid only the minimum for 1 year at 45% interest. Approximately how much do you owe now?',
                        options: ['₹10,450', '₹12,000', '₹14,500', '₹20,000'],
                        answerIndex: 2,
                        explanation: '45% annual interest on ₹10,000 = ₹4,500 interest per year. Your debt grows to approximately ₹14,500 if only minimums are paid.',
                    },
                ],
            },
            {
                id: 'mod_b5',
                title: 'Creating Your Budget',
                description: 'Build a budget in 30 minutes',
                duration: '12 mins',
                difficulty: 'intermediate',
                completed: false,
                keyPoints: [
                    'List ALL monthly income sources',
                    'List all expenses (use credit card statements)',
                    'Apply 50-30-20 rule',
                    'Find leaks (small subscriptions add up)',
                    'Review monthly & adjust',
                ],
                content: 'Step 1: Open a spreadsheet. List income (salary, freelance, etc.). Step 2: List expenses from last 3 months (credit card bill, UPI transactions). Categorize: Rent, Food, Transport, Subscriptions, Dining, Clothes, etc. Step 3: Calculate percentages. If Dining = ₹8k and income = ₹100k, that\'s 8% (good). If = ₹15k, that\'s 15% (too high for "wants"). Step 4: Adjust. Cut Netflix & save ₹500/month? That\'s ₹6k/year. Step 5: Use this budget as your spending plan. Track actual vs planned every week.',
                quiz: [
                    {
                        question: 'What is the most useful source of data to track your current spending?',
                        options: ['Your memory and guesses', 'Your last 3 months of credit card and UPI statements', 'A TV programme about money', 'Your employer\'s HR department'],
                        answerIndex: 1,
                        explanation: 'Bank and credit card statements reveal actual spending patterns with no guesswork. Most banks let you download statements as PDFs or CSVs.',
                    },
                    {
                        question: 'You find three forgotten subscriptions totaling ₹800/month. If you cancel all three, how much do you save in a year?',
                        options: ['₹800', '₹4,800', '₹9,600', '₹2,400'],
                        answerIndex: 2,
                        explanation: '₹800/month × 12 months = ₹9,600/year. Small recurring costs add up massively over time.',
                    },
                    {
                        question: 'How often should you review and adjust your budget?',
                        options: ['Once at the start of life', 'Only when you get a salary hike', 'Monthly, to compare actual vs planned spending', 'Every 5 years'],
                        answerIndex: 2,
                        explanation: 'Monthly reviews help you catch overspending early and adjust before it becomes a habit. Life changes (new expenses, income changes) need budget updates.',
                    },
                ],
            },
        ],
    },
    {
        id: 'taxSimplified',
        title: 'Tax Simplified',
        description: 'Decode ITR filing, Section 80C/80D, and capital gains tax',
        overview: 'Taxes confuse everyone. This 6-module course demystifies Indian income tax: how to file ITR, save tax smartly with deductions, understand capital gains, and avoid penalties. You\'ll discover that taxes aren\'t boring, they\'re an opportunity to save thousands.',
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
                content: 'Income earned in India is taxed by the government. Salary, business profit, rental income, investment income, all taxed. India uses a "progressive" system: earn ₹2.5L/year, zero tax. Earn ₹10L, you pay 20-30% on amount above ₹7.5L (not on entire ₹10L). This year\'s slab (2025-26): ₹0-2.5L = 0%, ₹2.5-5L = 5%, ₹5-10L = 20%, ₹10L+ = 30%. You must file ITR every year if income exceeds ₹2.5L.',
                quiz: [
                    {
                        question: 'India uses a "progressive" tax system. What does this mean?',
                        options: ['Everyone pays the same flat tax rate', 'Higher income earners pay a higher percentage in tax', 'Only businesses pay income tax', 'Tax rates decrease as income grows'],
                        answerIndex: 1,
                        explanation: 'Progressive tax means rates increase in steps as income rises. The first ₹2.5L is tax-free; income above ₹10L is taxed at 30%.',
                    },
                    {
                        question: 'If you earn ₹10L/year, are you taxed on the ENTIRE ₹10L at 30%?',
                        options: ['Yes, the full ₹10L at 30%', 'No, only the portion above each slab threshold is taxed at that slab\'s rate', 'No, income below ₹5L is always tax-free', 'Yes, but only if you are salaried'],
                        answerIndex: 1,
                        explanation: 'Tax slabs are marginal. You pay 0% on the first ₹2.5L, 5% on ₹2.5L-5L, 20% on ₹5L-10L. The 30% rate only applies to income ABOVE ₹10L.',
                    },
                    {
                        question: 'What is an ITR (Income Tax Return)?',
                        options: ['A receipt for paying taxes', 'An annual filing declaring income, deductions, and tax paid/owed to the government', 'A government grant for tax payers', 'A bank statement for tax purposes'],
                        answerIndex: 1,
                        explanation: 'ITR is a declaration you file annually with the Income Tax Department, reporting income from all sources and claiming deductions. It determines your final tax liability.',
                    },
                ],
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
                quiz: [
                    {
                        question: 'What is the maximum tax deduction allowed under Section 80C per year?',
                        options: ['₹50,000', '₹1,00,000', '₹1,50,000', '₹2,00,000'],
                        answerIndex: 2,
                        explanation: 'Section 80C allows a maximum deduction of ₹1.5 lakh per financial year from your taxable income.',
                    },
                    {
                        question: 'ELSS mutual funds qualify for Section 80C deduction. What is their minimum lock-in period?',
                        options: ['1 year', '3 years', '5 years', '15 years'],
                        answerIndex: 1,
                        explanation: 'ELSS (Equity Linked Savings Scheme) has a 3-year lock-in: the shortest among all 80C instruments, while offering equity market returns.',
                    },
                    {
                        question: 'If you are in the 30% tax bracket and invest ₹1.5L under Section 80C, how much tax do you save?',
                        options: ['₹10,000', '₹25,000', '₹45,000', '₹1,50,000'],
                        answerIndex: 2,
                        explanation: '₹1,50,000 × 30% = ₹45,000 in tax savings. This is the maximum benefit of 80C for highest-bracket taxpayers.',
                    },
                ],
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
                quiz: [
                    {
                        question: 'Section 80D allows you to deduct which of the following?',
                        options: ['Gym membership fees', 'Health insurance (Mediclaim) premiums', 'Hospital treatment costs directly', 'Ayurvedic supplement costs'],
                        answerIndex: 1,
                        explanation: 'Section 80D covers health insurance premiums paid for yourself, spouse, children, and parents, not direct medical expenses.',
                    },
                    {
                        question: 'Under Section 80E on education loans, what portion of repayment is deductible?',
                        options: ['Principal amount only', 'Both principal and interest equally', 'Interest paid only (no upper limit)', 'Only 50% of total repayment'],
                        answerIndex: 2,
                        explanation: 'Section 80E deducts the interest component of education loan repayments with NO upper limit ceiling, making it very powerful for higher education loans.',
                    },
                    {
                        question: 'Your parents are 64 years old and have a health insurance policy. How much can you deduct under Section 80D for their premium?',
                        options: ['₹25,000', '₹50,000', '₹75,000', 'No deduction for parents'],
                        answerIndex: 1,
                        explanation: 'For senior citizen parents (60+), Section 80D allows a deduction of up to ₹50,000 per year on their health insurance premiums.',
                    },
                ],
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
                content: 'Buy Reliance stock at ₹2,000, sell at ₹2,500 = ₹500 profit (capital gain). Holding period matters: (1) Short-term (< 1 year): Taxed as regular income (up to 30%). (2) Long-term (> 1 year): Lower rates. Equity funds held >1 year: 15% tax if gain ≤ ₹1L, else 20%. Property held >2 years: 20% tax. This is why you hear "buy and hold"; it\'s tax-efficient. Example: Profit ₹50k from mutual fund (1-year hold) = ₹7,500 tax (15%). Same profit short-term = ₹15,000 tax (30%). Double the tax!',
                quiz: [
                    {
                        question: 'You bought a stock and sold it 8 months later for a ₹20,000 profit. How is this taxed?',
                        options: ['As Long-Term Capital Gain at 15%', 'As Short-Term Capital Gain added to regular income', 'It is completely tax-free', 'At a flat 10% rate'],
                        answerIndex: 1,
                        explanation: 'Holding for less than 1 year = Short-Term Capital Gain (STCG). For equity, STCG is taxed at 15%. For other assets, it\'s treated as regular income.',
                    },
                    {
                        question: 'Why do financial advisors recommend "buy and hold" as a tax strategy?',
                        options: ['Long-term gains are always tax-free', 'Long-term capital gains have lower tax rates than short-term gains', 'Markets only go up over time', 'SEBI mandates holding for 1 year minimum'],
                        answerIndex: 1,
                        explanation: 'Holding assets longer than 1 year (equity) or 2 years (property) qualifies you for Long-Term Capital Gains tax rates which are significantly lower.',
                    },
                    {
                        question: 'On equity mutual funds held over 1 year, long-term gains up to ₹1 lakh per year are:',
                        options: ['Taxed at 30%', 'Taxed at 20%', 'Completely exempt from tax', 'Taxed at 15%'],
                        answerIndex: 2,
                        explanation: 'Under current rules, long-term capital gains (LTCG) on equity up to ₹1 lakh per year are completely tax-free. Above ₹1L, LTCG is taxed at 10% (updated rate).',
                    },
                ],
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
                quiz: [
                    {
                        question: 'Which ITR form should a salaried employee with no business income use?',
                        options: ['ITR-3', 'ITR-4 (Sugam)', 'ITR-1 (Sahaj)', 'ITR-7'],
                        answerIndex: 2,
                        explanation: 'ITR-1 (Sahaj) is the simplest form for salaried individuals with income from salary, one house property, and other sources (excluding business/profession).',
                    },
                    {
                        question: 'What is the usual deadline for filing your ITR in India?',
                        options: ['March 31', 'June 30', 'July 31', 'December 31'],
                        answerIndex: 2,
                        explanation: 'The standard ITR filing deadline for individuals is July 31 of the assessment year (for the financial year ending March 31). Late filing attracts a ₹5,000 penalty.',
                    },
                    {
                        question: 'What is Form 16, and why is it important for filing ITR?',
                        options: ['A loan repayment certificate from a bank', 'A certificate issued by your employer showing salary and TDS deducted', 'A form for self-employed individuals', 'A government ID document'],
                        answerIndex: 1,
                        explanation: 'Form 16 is issued by your employer showing your salary, allowances, and Tax Deducted at Source (TDS). It\'s your primary document for filing ITR-1.',
                    },
                ],
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
                    'Don\'t ignore tax notices, reply quickly',
                ],
                content: 'Biggest mistakes: (1) Hiding income. Income Tax Dept tracks bank deposits, property registrations, credit card purchases. You can\'t evade. (2) Claiming fake deductions. If audited, you must show proof. (3) Late filing after July 31, penalty ₹5k + interest. (4) Ignoring tax notices. If IT Dept sends a notice, respond within 30 days with documents. Silence = default assessment (they calculate tax for you, often higher). (5) Not keeping records. Keep receipts, invoices, statements for 5 years. Insurance? Keep policy documents. Real estate? Keep sale deed & payment receipts.',
                quiz: [
                    {
                        question: 'You receive a tax notice from the Income Tax Department. What should you do?',
                        options: ['Ignore it; it\'s probably spam', 'Respond within 30 days with relevant documents', 'Call a friend who is not a tax professional', 'Wait for a second notice'],
                        answerIndex: 1,
                        explanation: 'Tax notices have strict deadlines (usually 30 days). Ignoring them leads to "ex-parte" or default assessments where the IT department calculates your tax, usually unfavorably.',
                    },
                    {
                        question: 'Can the Income Tax Department detect income you haven\'t reported?',
                        options: ['No, they only know what you tell them', 'Yes, they track large bank deposits, property registrations, and credit card spends', 'Only for amounts above ₹1 crore', 'Only for foreign income'],
                        answerIndex: 1,
                        explanation: 'The IT Department has access to Annual Information Returns (AIR) from banks, registrars, and financial institutions. Large transactions are automatically flagged.',
                    },
                    {
                        question: 'How long should you keep financial records (receipts, statements) for tax purposes?',
                        options: ['1 year', '2 years', '5 years', 'Forever'],
                        answerIndex: 2,
                        explanation: 'The IT Department can re-open assessments up to 5-7 years. Keep all tax-related records (invoices, bank statements, investment proofs) for at least 5 years.',
                    },
                ],
            },
        ],
    },
];

export const GLOSSARY: GlossaryTerm[] = [
    { term: 'SIP', definition: 'Systematic Investment Plan: a method to invest a fixed amount regularly in mutual funds. Like a recurring deposit, but for mutual funds.' },
    { term: 'NAV', definition: 'Net Asset Value: the per-unit price of a mutual fund. It changes daily based on the fund\'s holdings.' },
    { term: 'CAGR', definition: 'Compound Annual Growth Rate: the average annual growth rate of an investment over a specified period.' },
    { term: 'Repo Rate', definition: 'The rate at which RBI lends money to commercial banks. When RBI increases it, loans become more expensive.' },
    { term: 'NIFTY 50', definition: 'An index of the top 50 companies listed on the National Stock Exchange (NSE) by market capitalization.' },
    { term: 'SENSEX', definition: 'Short for Sensitive Index: an index of the top 30 companies on the Bombay Stock Exchange (BSE).' },
    { term: 'Mutual Fund', definition: 'A pool of money collected from many investors, managed by a professional fund manager who invests in stocks, bonds, etc.' },
    { term: 'EMI', definition: 'Equated Monthly Installment: a fixed payment amount you make each month to repay a loan.' },
    { term: 'UPI', definition: 'Unified Payments Interface, India\'s instant real-time payment system used via apps like GPay, PhonePe.' },
    { term: 'ELSS', definition: 'Equity Linked Savings Scheme: a type of mutual fund that offers tax benefits under Section 80C with a 3-year lock-in.' },
    { term: 'P/E Ratio', definition: 'Price-to-Earnings Ratio: how much investors are willing to pay for ₹1 of a company\'s earnings. Higher P/E = more expensive.' },
    { term: 'Liquidity', definition: 'How quickly you can convert an asset to cash without losing value. Savings accounts are highly liquid; real estate is not.' },
    { term: 'Diversification', definition: 'Spreading investments across different assets to reduce risk. "Don\'t put all your eggs in one basket."' },
    { term: 'Bull Market', definition: 'A market where prices are rising and investor confidence is high.' },
    { term: 'Bear Market', definition: 'A market where prices are falling and investor confidence is low.' },
];

