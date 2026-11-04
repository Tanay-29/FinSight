/**
 * The tools behind "Ask anything".
 *
 * A question becomes one of these small calculators, opened with starting
 * values taken from the question. The model only chooses which tool and what
 * numbers to start at; every figure on screen is computed here, in code, the
 * same rule the rest of the app keeps. A tool is a list of sliders and a pure
 * function from their values to figures, chart series and one plain sentence.
 *
 * Adding a tool: give it an id, its sliders and a compute function, and add a
 * few keywords so the offline matcher can find it without the model.
 */
import { emi, minimumDuePayoff, fixedPaymentPayoff, noCostEmi, inr, inrShort } from './moneyMath';
import { futureValueOfSeries } from './projections';

export type ParamUnit = 'inr' | 'percent' | 'years' | 'months';

export interface ToolParam {
    key: string;
    label: string;
    unit: ParamUnit;
    min: number;
    max: number;
    step: number;
    initial: number;
}

export interface ToolFigure {
    label: string;
    value: number;
    unit: 'inr' | 'months' | 'years' | 'percent';
    tone?: 'good' | 'bad' | 'neutral';
}

export interface ToolSeries {
    label: string;
    points: number[];
    tone: 'primary' | 'secondary' | 'bad';
}

export interface ToolBar {
    label: string;
    value: number;
    tone: 'primary' | 'bad' | 'muted';
}

export interface ToolResult {
    figures: ToolFigure[];
    /** Lines over time. The x axis is `xUnit`, starting at 0. */
    series?: ToolSeries[];
    xUnit?: 'year' | 'month';
    /** A breakdown, for tools that are about parts rather than time. */
    bars?: ToolBar[];
    insight: string;
}

export interface AskTool {
    id: string;
    title: string;
    /** The question it answers, as a person would ask it. */
    asks: string;
    keywords: string[];
    params: ToolParam[];
    /** Stated on screen, so the assumptions are never hidden. */
    assumes?: string;
    compute: (v: Record<string, number>) => ToolResult;
}

const rs = (n: number) => `₹${inr(n)}`;
const rsShort = (n: number) => `₹${inrShort(n)}`;
const pct = (n: number) => `${Math.round(n)}%`;
const yearsLabel = (y: number) => `${y} year${y === 1 ? '' : 's'}`;
const monthsToText = (m: number) => {
    if (m < 12) return `${m} month${m === 1 ? '' : 's'}`;
    const y = Math.floor(m / 12);
    const r = m % 12;
    return r === 0 ? yearsLabel(y) : `${yearsLabel(y)} ${r} month${r === 1 ? '' : 's'}`;
};

/** Balance of a reducing loan after k monthly payments. */
function loanBalance(principal: number, annualRate: number, months: number, k: number): number {
    const r = annualRate / 12;
    if (r === 0) return Math.max(0, principal - (principal / months) * k);
    const f = Math.pow(1 + r, months);
    const fk = Math.pow(1 + r, k);
    return Math.max(0, principal * (f - fk) / (f - 1));
}

/** Value of a monthly SIP at each year end, index 0 = today. */
function sipByYear(monthly: number, ratePct: number, years: number): number[] {
    const out: number[] = [];
    for (let y = 0; y <= years; y++) out.push(futureValueOfSeries(monthly, 'monthly', ratePct, y));
    return out;
}

export const ASK_TOOLS: AskTool[] = [
    {
        id: 'loan',
        title: 'What a loan really costs',
        asks: 'How much will this loan cost me?',
        keywords: ['loan', 'emi', 'borrow', 'personal loan', 'car loan', 'bike', 'education loan', 'interest', 'home loan'],
        params: [
            { key: 'amount', label: 'Borrow', unit: 'inr', min: 10_000, max: 5_000_000, step: 10_000, initial: 300_000 },
            { key: 'rate', label: 'Interest rate', unit: 'percent', min: 1, max: 36, step: 0.5, initial: 12 },
            { key: 'years', label: 'Repay over', unit: 'years', min: 1, max: 30, step: 1, initial: 3 },
        ],
        compute: ({ amount, rate, years }) => {
            const months = years * 12;
            const m = emi(amount, rate / 100, months);
            const total = m * months;
            const interest = total - amount;
            const balance: number[] = [];
            const paid: number[] = [];
            for (let y = 0; y <= years; y++) {
                balance.push(loanBalance(amount, rate / 100, months, y * 12));
                paid.push(m * 12 * y);
            }
            return {
                figures: [
                    { label: 'Monthly EMI', value: m, unit: 'inr' },
                    { label: 'Total interest', value: interest, unit: 'inr', tone: 'bad' },
                    { label: 'You pay back', value: total, unit: 'inr' },
                ],
                series: [
                    { label: 'Still owed', points: balance, tone: 'bad' },
                    { label: 'Paid so far', points: paid, tone: 'primary' },
                ],
                xUnit: 'year',
                insight: `You pay back ${rs(total)} for ${rs(amount)}: ${pct((interest / amount) * 100)} more than you borrowed.`,
            };
        },
    },
    {
        id: 'sip',
        title: 'What a monthly investment grows to',
        asks: 'If I invest every month, what will I have?',
        keywords: ['sip', 'invest', 'mutual fund', 'index fund', 'compound', 'grow', 'returns', 'stock', 'every month'],
        params: [
            { key: 'monthly', label: 'Every month', unit: 'inr', min: 500, max: 100_000, step: 500, initial: 5_000 },
            { key: 'rate', label: 'Yearly return', unit: 'percent', min: 1, max: 15, step: 0.5, initial: 10 },
            { key: 'years', label: 'For', unit: 'years', min: 1, max: 40, step: 1, initial: 15 },
        ],
        assumes: 'A steady yearly return. Real markets go up and down on the way.',
        compute: ({ monthly, rate, years }) => {
            const value = sipByYear(monthly, rate, years);
            const invested = value.map((_, y) => monthly * 12 * y);
            const end = value[value.length - 1];
            const put = invested[invested.length - 1];
            return {
                figures: [
                    { label: 'You put in', value: put, unit: 'inr' },
                    { label: 'It grows to', value: end, unit: 'inr', tone: 'good' },
                    { label: 'Growth', value: end - put, unit: 'inr', tone: 'good' },
                ],
                series: [
                    { label: 'Value', points: value, tone: 'primary' },
                    { label: 'Put in', points: invested, tone: 'secondary' },
                ],
                xUnit: 'year',
                insight: end - put > put
                    ? `Growth earns ${rsShort(end - put)}, more than the ${rsShort(put)} you put in yourself.`
                    : `Growth adds ${rsShort(end - put)} to the ${rsShort(put)} you put in. Give it longer and growth overtakes you.`,
            };
        },
    },
    {
        id: 'delay',
        title: 'The cost of starting later',
        asks: 'Does it matter if I start investing a few years later?',
        keywords: ['later', 'wait', 'delay', 'start now', 'early', 'young', 'age', 'when should i start', 'start investing', 'instead of'],
        params: [
            { key: 'monthly', label: 'Every month', unit: 'inr', min: 500, max: 50_000, step: 500, initial: 3_000 },
            { key: 'delay', label: 'Start this much later', unit: 'years', min: 1, max: 15, step: 1, initial: 5 },
            { key: 'years', label: 'Look this far ahead', unit: 'years', min: 10, max: 40, step: 1, initial: 30 },
            { key: 'rate', label: 'Yearly return', unit: 'percent', min: 1, max: 15, step: 0.5, initial: 10 },
        ],
        assumes: 'The same amount every month and a steady return for both.',
        compute: ({ monthly, delay, years, rate }) => {
            const d = Math.min(delay, years - 1);
            const now = sipByYear(monthly, rate, years);
            const later = now.map((_, y) => (y <= d ? 0 : futureValueOfSeries(monthly, 'monthly', rate, y - d)));
            const a = now[now.length - 1];
            const b = later[later.length - 1];
            return {
                figures: [
                    { label: 'Start now', value: a, unit: 'inr', tone: 'good' },
                    { label: `Start in ${d} years`, value: b, unit: 'inr' },
                    { label: 'Cost of waiting', value: a - b, unit: 'inr', tone: 'bad' },
                ],
                series: [
                    { label: 'Start now', points: now, tone: 'primary' },
                    { label: 'Start later', points: later, tone: 'secondary' },
                ],
                xUnit: 'year',
                insight: `Waiting ${yearsLabel(d)} saves you ${rsShort(monthly * 12 * d)} of payments and costs you ${rsShort(a - b)} at the end.`,
            };
        },
    },
    {
        id: 'inflation',
        title: 'What inflation does to your money',
        asks: 'What will my money be worth in a few years?',
        keywords: ['inflation', 'worth', 'prices', 'value of money', 'future value', 'expensive', 'cost of living'],
        params: [
            { key: 'amount', label: 'Money today', unit: 'inr', min: 1_000, max: 1_000_000, step: 1_000, initial: 100_000 },
            { key: 'rate', label: 'Inflation a year', unit: 'percent', min: 1, max: 12, step: 0.5, initial: 6 },
            { key: 'years', label: 'Years from now', unit: 'years', min: 1, max: 40, step: 1, initial: 10 },
        ],
        compute: ({ amount, rate, years }) => {
            const power: number[] = [];
            const needed: number[] = [];
            for (let y = 0; y <= years; y++) {
                power.push(amount / Math.pow(1 + rate / 100, y));
                needed.push(amount * Math.pow(1 + rate / 100, y));
            }
            const end = power[power.length - 1];
            return {
                figures: [
                    { label: 'Buys what this buys today', value: end, unit: 'inr', tone: 'bad' },
                    { label: 'To keep up you need', value: needed[needed.length - 1], unit: 'inr' },
                    { label: 'Lost to inflation', value: amount - end, unit: 'inr', tone: 'bad' },
                ],
                series: [
                    { label: 'What it buys', points: power, tone: 'bad' },
                    { label: 'What you would need', points: needed, tone: 'secondary' },
                ],
                xUnit: 'year',
                insight: `Kept as cash, ${rs(amount)} buys only ${rs(end)} worth of today's things in ${yearsLabel(years)}.`,
            };
        },
    },
    {
        id: 'cardMinimum',
        title: 'Paying only the minimum on a card',
        asks: 'What happens if I only pay the minimum due?',
        keywords: ['credit card', 'minimum', 'minimum due', 'card bill', 'card debt', 'revolving', 'pay later'],
        params: [
            { key: 'balance', label: 'Card balance', unit: 'inr', min: 1_000, max: 500_000, step: 1_000, initial: 50_000 },
            { key: 'apr', label: 'Interest a year', unit: 'percent', min: 12, max: 48, step: 1, initial: 42 },
            { key: 'payment', label: 'Or pay a fixed amount', unit: 'inr', min: 500, max: 50_000, step: 500, initial: 5_000 },
        ],
        assumes: 'Minimum due is 5% of the balance or ₹200, whichever is more. No new spending on the card.',
        compute: ({ balance, apr, payment }) => {
            const min = minimumDuePayoff(balance, apr / 100, 0.05, 200);
            const fixed = fixedPaymentPayoff(balance, apr / 100, payment);
            const len = Math.max(min.balances.length, fixed.balances.length);
            const pad = (arr: number[]) => [balance, ...Array.from({ length: len }, (_, i) => arr[i] ?? 0)];
            return {
                figures: [
                    { label: 'Minimum only: time to clear', value: min.months, unit: 'months', tone: 'bad' },
                    { label: 'Minimum only: interest', value: min.totalInterest, unit: 'inr', tone: 'bad' },
                    { label: `Paying ${rs(payment)}: interest`, value: fixed.cleared ? fixed.totalInterest : NaN, unit: 'inr', tone: 'good' },
                ],
                series: [
                    { label: 'Minimum only', points: pad(min.balances), tone: 'bad' },
                    { label: `${rs(payment)} a month`, points: pad(fixed.balances), tone: 'primary' },
                ],
                xUnit: 'month',
                insight: !fixed.cleared
                    ? `${rs(payment)} a month does not even cover the interest. The balance never clears.`
                    : `Minimum only takes ${monthsToText(min.months)}. ${rs(payment)} a month clears it in ${monthsToText(fixed.months)} and saves ${rs(min.totalInterest - fixed.totalInterest)}.`,
            };
        },
    },
    {
        id: 'noCostEmi',
        title: 'Is "no-cost EMI" really free?',
        asks: 'Should I buy this on no-cost EMI?',
        keywords: ['no cost emi', 'no-cost', 'zero cost', 'iphone', 'phone on emi', 'laptop', 'buy now pay later', 'bnpl', 'installment'],
        params: [
            { key: 'price', label: 'Price', unit: 'inr', min: 5_000, max: 200_000, step: 1_000, initial: 60_000 },
            { key: 'months', label: 'Months', unit: 'months', min: 3, max: 24, step: 3, initial: 9 },
            { key: 'discount', label: 'Cash discount you give up', unit: 'inr', min: 0, max: 15_000, step: 250, initial: 2_000 },
        ],
        assumes: 'Lender rate 15% a year, ₹199 processing fee, 18% GST on interest and fee.',
        compute: ({ price, months, discount }) => {
            const r = noCostEmi(price, months, 0.15, 199, discount);
            return {
                figures: [
                    { label: 'Monthly', value: price / months, unit: 'inr' },
                    { label: 'Extra over paying cash', value: r.extraOverCash, unit: 'inr', tone: 'bad' },
                    { label: 'You really pay', value: r.trueCost, unit: 'inr' },
                ],
                bars: [
                    { label: 'Price', value: price, tone: 'muted' },
                    { label: 'Processing fee', value: r.processingFee, tone: 'bad' },
                    { label: 'GST on interest and fee', value: r.gstOnInterestAndFee, tone: 'bad' },
                    { label: 'Cash discount lost', value: r.foregoneDiscount, tone: 'bad' },
                ],
                insight: r.extraOverCash > 0
                    ? `"No-cost" costs ${rs(r.extraOverCash)} more than paying cash. Ask for the cash price first.`
                    : 'With no discount lost, this one is close to free. Check the processing fee.',
            };
        },
    },
    {
        id: 'rentVsBuy',
        title: 'Rent or buy a home',
        asks: 'Is it better to rent or buy?',
        keywords: ['rent or buy', 'buy a house', 'buy a flat', 'buy home', 'renting', 'house', 'flat', 'property', 'real estate'],
        params: [
            { key: 'price', label: 'Home price', unit: 'inr', min: 1_000_000, max: 30_000_000, step: 100_000, initial: 6_000_000 },
            { key: 'rent', label: 'Rent for the same home', unit: 'inr', min: 5_000, max: 150_000, step: 1_000, initial: 20_000 },
            { key: 'loanRate', label: 'Home loan rate', unit: 'percent', min: 6, max: 14, step: 0.25, initial: 8.5 },
            { key: 'years', label: 'Compare over', unit: 'years', min: 5, max: 30, step: 1, initial: 15 },
        ],
        assumes: '20% down payment, 20-year loan, home value +5% a year, rent +5% a year, renter invests the difference at 10%.',
        compute: ({ price, rent, loanRate, years }) => {
            const down = price * 0.2;
            const loan = price - down;
            const loanMonths = 240;
            const m = emi(loan, loanRate / 100, loanMonths);
            const buy: number[] = [];
            const rentNet: number[] = [];
            let portfolio = down;
            let monthlyRent = rent;
            buy.push(down);
            rentNet.push(down);
            for (let mo = 1; mo <= years * 12; mo++) {
                const owning = mo <= loanMonths ? m : 0;
                portfolio = portfolio * (1 + 0.10 / 12) + Math.max(0, owning - monthlyRent);
                if (mo % 12 === 0) {
                    monthlyRent *= 1.05;
                    const y = mo / 12;
                    const home = price * Math.pow(1.05, y);
                    buy.push(home - loanBalance(loan, loanRate / 100, loanMonths, Math.min(mo, loanMonths)));
                    rentNet.push(portfolio);
                }
            }
            const b = buy[buy.length - 1];
            const r = rentNet[rentNet.length - 1];
            return {
                figures: [
                    { label: 'EMI to buy', value: m, unit: 'inr' },
                    { label: `Buyer's wealth, year ${years}`, value: b, unit: 'inr', tone: b >= r ? 'good' : 'neutral' },
                    { label: `Renter's wealth, year ${years}`, value: r, unit: 'inr', tone: r > b ? 'good' : 'neutral' },
                ],
                series: [
                    { label: 'Buy', points: buy, tone: 'primary' },
                    { label: 'Rent and invest', points: rentNet, tone: 'secondary' },
                ],
                xUnit: 'year',
                insight: b >= r
                    ? `Over ${yearsLabel(years)}, buying comes out ${rsShort(b - r)} ahead on these assumptions.`
                    : `Over ${yearsLabel(years)}, renting and investing the difference comes out ${rsShort(r - b)} ahead.`,
            };
        },
    },
    {
        id: 'runway',
        title: 'How long your savings last',
        asks: 'If my income stopped, how long could I last?',
        keywords: ['emergency', 'emergency fund', 'lose my job', 'job loss', 'last', 'runway', 'savings last', 'layoff'],
        params: [
            { key: 'savings', label: 'Savings', unit: 'inr', min: 0, max: 2_000_000, step: 5_000, initial: 120_000 },
            { key: 'spend', label: 'You spend a month', unit: 'inr', min: 5_000, max: 200_000, step: 1_000, initial: 30_000 },
        ],
        assumes: 'A common target is 3 to 6 months of spending.',
        compute: ({ savings, spend }) => {
            const months = spend > 0 ? Math.floor(savings / spend) : 0;
            const points: number[] = [];
            for (let i = 0; i <= Math.max(6, months + 1); i++) points.push(Math.max(0, savings - spend * i));
            return {
                figures: [
                    { label: 'Lasts', value: months, unit: 'months', tone: months >= 6 ? 'good' : months >= 3 ? 'neutral' : 'bad' },
                    { label: 'For 6 months you need', value: spend * 6, unit: 'inr' },
                    { label: 'Gap to 6 months', value: Math.max(0, spend * 6 - savings), unit: 'inr', tone: savings >= spend * 6 ? 'good' : 'bad' },
                ],
                series: [{ label: 'Savings left', points, tone: months >= 3 ? 'primary' : 'bad' }],
                xUnit: 'month',
                insight: months >= 6
                    ? `You could go ${monthsToText(months)} with no income. That is a real cushion.`
                    : `${monthsToText(months)} with no income. Building to six months means ${rs(Math.max(0, spend * 6 - savings))} more.`,
            };
        },
    },
    {
        id: 'goal',
        title: 'How long to save for something',
        asks: 'How long will it take to save for this?',
        keywords: ['save for', 'saving for', 'how long', 'goal', 'trip', 'target', 'down payment', 'wedding', 'afford'],
        params: [
            { key: 'target', label: 'You need', unit: 'inr', min: 5_000, max: 5_000_000, step: 5_000, initial: 150_000 },
            { key: 'monthly', label: 'You save a month', unit: 'inr', min: 500, max: 200_000, step: 500, initial: 8_000 },
            { key: 'rate', label: 'Interest it earns', unit: 'percent', min: 0, max: 12, step: 0.5, initial: 7 },
        ],
        compute: ({ target, monthly, rate }) => {
            const r = rate / 100 / 12;
            let bal = 0;
            let mo = 0;
            const points = [0];
            while (bal < target && mo < 600) {
                bal = bal * (1 + r) + monthly;
                mo += 1;
                points.push(bal);
            }
            const flat = Math.ceil(target / monthly);
            return {
                figures: [
                    { label: 'Time to get there', value: mo, unit: 'months' },
                    { label: 'Interest helps by', value: Math.max(0, flat - mo), unit: 'months', tone: 'good' },
                    { label: 'You put in', value: monthly * mo, unit: 'inr' },
                ],
                series: [{ label: 'Saved', points, tone: 'primary' }],
                xUnit: 'month',
                insight: `${monthsToText(mo)} at ${rs(monthly)} a month. Another ${rs(1_000)} a month gets you there sooner.`,
            };
        },
    },
    {
        id: 'fdReal',
        title: 'Does a fixed deposit beat inflation?',
        asks: 'Is my FD actually growing my money?',
        keywords: ['fd', 'my fd', 'fixed deposit', 'savings account', 'bank interest', 'real return', 'beat inflation', 'beating inflation', 'deposit'],
        params: [
            { key: 'amount', label: 'Deposit', unit: 'inr', min: 10_000, max: 5_000_000, step: 10_000, initial: 200_000 },
            { key: 'fdRate', label: 'FD rate', unit: 'percent', min: 2, max: 10, step: 0.25, initial: 7 },
            { key: 'inflation', label: 'Inflation', unit: 'percent', min: 1, max: 12, step: 0.5, initial: 6 },
            { key: 'tax', label: 'Your tax rate on interest', unit: 'percent', min: 0, max: 30, step: 5, initial: 20 },
        ],
        assumes: 'Ten years, interest taxed each year at your rate.',
        compute: ({ amount, fdRate, inflation, tax }) => {
            const years = 10;
            const net = (fdRate / 100) * (1 - tax / 100);
            const nominal: number[] = [];
            const real: number[] = [];
            for (let y = 0; y <= years; y++) {
                const v = amount * Math.pow(1 + net, y);
                nominal.push(v);
                real.push(v / Math.pow(1 + inflation / 100, y));
            }
            const realEnd = real[real.length - 1];
            const realRate = ((1 + net) / (1 + inflation / 100) - 1) * 100;
            return {
                figures: [
                    { label: 'In the bank, year 10', value: nominal[nominal.length - 1], unit: 'inr' },
                    { label: "In today's money", value: realEnd, unit: 'inr', tone: realEnd >= amount ? 'good' : 'bad' },
                    { label: 'Real growth a year', value: Math.round(realRate * 10) / 10, unit: 'percent', tone: realRate >= 0 ? 'good' : 'bad' },
                ],
                series: [
                    { label: 'Rupees in the bank', points: nominal, tone: 'secondary' },
                    { label: 'What they can buy', points: real, tone: realEnd >= amount ? 'primary' : 'bad' },
                ],
                xUnit: 'year',
                insight: realEnd >= amount
                    ? `After tax and inflation it still grows, slowly: ${rs(realEnd)} of today's money after 10 years.`
                    : `The number goes up, but after tax and inflation it buys less: ${rs(realEnd)} of today's money after 10 years.`,
            };
        },
    },
    {
        id: 'subscription',
        title: 'What a small monthly habit adds up to',
        asks: 'Is this subscription worth it?',
        keywords: ['subscription', 'netflix', 'spotify', 'gym', 'coffee', 'daily', 'habit', 'small', 'every day', 'swiggy', 'zomato', 'ordering'],
        params: [
            { key: 'monthly', label: 'Costs a month', unit: 'inr', min: 50, max: 20_000, step: 50, initial: 1_500 },
            { key: 'years', label: 'For', unit: 'years', min: 1, max: 30, step: 1, initial: 10 },
            { key: 'rate', label: 'If invested instead, return', unit: 'percent', min: 0, max: 15, step: 0.5, initial: 10 },
        ],
        compute: ({ monthly, years, rate }) => {
            const invested = sipByYear(monthly, rate, years);
            const paid = invested.map((_, y) => monthly * 12 * y);
            const end = invested[invested.length - 1];
            return {
                figures: [
                    { label: 'You pay in total', value: paid[paid.length - 1], unit: 'inr', tone: 'bad' },
                    { label: 'Invested instead', value: end, unit: 'inr', tone: 'good' },
                    { label: 'A year', value: monthly * 12, unit: 'inr' },
                ],
                series: [
                    { label: 'Invested instead', points: invested, tone: 'primary' },
                    { label: 'Paid', points: paid, tone: 'bad' },
                ],
                xUnit: 'year',
                insight: `${rs(monthly)} a month is ${rs(monthly * 12)} a year. Over ${yearsLabel(years)}, invested, it would be ${rsShort(end)}. Worth it if you use it.`,
            };
        },
    },
];

export function findTool(id: string): AskTool | undefined {
    return ASK_TOOLS.find((t) => t.id === id);
}

/** Snap a value into a slider's range and step. */
export function clampParam(p: ToolParam, v: number): number {
    if (!Number.isFinite(v)) return p.initial;
    const snapped = Math.round((v - p.min) / p.step) * p.step + p.min;
    return Math.min(p.max, Math.max(p.min, Number(snapped.toFixed(4))));
}

export function initialValues(tool: AskTool, overrides: Record<string, number> = {}): Record<string, number> {
    const out: Record<string, number> = {};
    for (const p of tool.params) out[p.key] = clampParam(p, overrides[p.key] ?? p.initial);
    return out;
}

export function formatParam(unit: ParamUnit, v: number): string {
    if (unit === 'inr') return rs(v);
    if (unit === 'percent') return `${v}%`;
    if (unit === 'years') return yearsLabel(v);
    return `${v} month${v === 1 ? '' : 's'}`;
}

export function formatFigure(f: ToolFigure): string {
    if (!Number.isFinite(f.value)) return 'Never clears';
    if (f.unit === 'inr') return f.value >= 100_000 ? rsShort(f.value) : rs(f.value);
    if (f.unit === 'months') {
        // Short form for the figure tiles: "15 yr 5 mo" fits where "15 years 5 months" cannot.
        const m = Math.round(f.value);
        if (m < 12) return `${m} mo`;
        const y = Math.floor(m / 12);
        const r = m % 12;
        return r === 0 ? `${y} yr` : `${y} yr ${r} mo`;
    }
    if (f.unit === 'years') return yearsLabel(Math.round(f.value));
    return `${f.value}%`;
}

// ─── Offline matching ─────────────────────────────────────────

/**
 * Pick a tool and starting values without the model, from keywords and the
 * numbers in the question. It is the fallback when the network or the model
 * is not there, so the screen always opens a working tool.
 */
export function matchOffline(question: string): { toolId: string; values: Record<string, number> } {
    const q = question.toLowerCase();
    let best = ASK_TOOLS[1];
    let bestScore = 0;
    for (const t of ASK_TOOLS) {
        let score = 0;
        for (const k of t.keywords) if (q.includes(k)) score += k.length;
        if (score > bestScore) { best = t; bestScore = score; }
    }
    return { toolId: best.id, values: numbersFor(best, q) };
}

/** Read "12%", "3 years", "6 months" and rupee amounts out of a question. */
export function numbersFor(tool: AskTool, q: string): Record<string, number> {
    const values: Record<string, number> = {};
    const num = (s: string) => Number(s.replace(/,/g, ''));
    const scaled = (n: number, unit?: string) => {
        const u = (unit ?? '').toLowerCase();
        if (u.startsWith('cr')) return n * 10_000_000;
        if (u.startsWith('l')) return n * 100_000;
        if (u === 'k' || u.startsWith('th')) return n * 1_000;
        return n;
    };
    const percent = q.match(/(\d+(?:\.\d+)?)\s*%/);
    const years = q.match(/(\d+)\s*(?:years?|yrs?)/);
    const months = q.match(/(\d+)\s*months?/);
    const amounts = [...q.matchAll(/(?:₹|rs\.?\s*)?(\d[\d,]*(?:\.\d+)?)\s*(lakhs?|lacs?|l\b|crores?|cr\b|k\b|thousand)?/g)]
        .filter((m) => !/^\s*(?:%|years?|yrs?|months?)/.test(q.slice((m.index ?? 0) + m[0].length)))
        .map((m) => scaled(num(m[1]), m[2]))
        .filter((n) => n >= 100);

    for (const p of tool.params) {
        if (p.unit === 'percent' && percent && values[p.key] === undefined) values[p.key] = Number(percent[1]);
        if (p.unit === 'years' && years && values[p.key] === undefined) values[p.key] = Number(years[1]);
        if (p.unit === 'months' && months && values[p.key] === undefined) values[p.key] = Number(months[1]);
    }
    // "at 28 instead of 22": two ages, and the gap is the delay.
    const ages = [...q.matchAll(/\b(1[6-9]|[2-5]\d|60)\b(?!\s*(?:%|years?|yrs?|months?|lakh|k\b))/g)].map((m) => Number(m[1]));
    if (tool.id === 'delay' && ages.length >= 2) values.delay = Math.abs(ages[0] - ages[1]);
    const inrParams = tool.params.filter((p) => p.unit === 'inr');
    amounts.slice(0, inrParams.length).forEach((a, i) => { values[inrParams[i].key] = a; });
    return values;
}
