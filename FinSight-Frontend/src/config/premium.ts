/**
 * What FinSight Plus is, and why these particular things are behind it.
 *
 * The line is drawn on marginal cost, not on what happens to look valuable.
 * Logging spending, budgets, categories, goals, the vitals screen and the
 * written course content all cost nothing per user once they exist, so gating
 * them would be charging rent on a fixed asset and would make the free app
 * useless enough that nobody would reach a paywall at all.
 *
 * The three features below each cost real money every time somebody uses them,
 * because each is a call to a hosted model:
 *
 *   - the coach's read on your score, and the three quests under it
 *   - flashcards generated from a module you just read
 *   - unlimited head-to-head rounds in the spending game
 *
 * That is a defensible answer to "why is this the paid part", which matters
 * more than any pricing trick: the paid features are the ones with a bill
 * attached.
 *
 * Everything in this file is a demonstration. No payment is taken, no card
 * details are collected anywhere in the app, and the entitlement is a flag on
 * the user's own profile. Wiring this to a real store means replacing
 * `simulatePurchase` with StoreKit or Play Billing, usually through
 * RevenueCat, and nothing else here has to change.
 */

export type PlanId = 'monthly' | 'annual';

export interface Plan {
    id: PlanId;
    label: string;
    /** Rupees per billing period. */
    price: number;
    /** What that works out to per month, for the anchor line. */
    perMonth: number;
    period: string;
    /** Percent saved against paying monthly for a year. */
    savings?: number;
    badge?: string;
}

/**
 * Priced for Indian students, not translated from a dollar figure.
 *
 * The comparison set here is Groww, INDmoney, Jar and Zerodha's Varsity, all
 * of which are free because they earn from broking or lending instead. An app
 * that only teaches has to charge, so it has to sit below the streaming
 * services a student already pays for rather than beside them: annual works
 * out under fifty rupees a month, which is less than one of the coffees the
 * Time Machine screen is about.
 */
export const PLANS: Plan[] = [
    {
        id: 'annual',
        label: 'Yearly',
        price: 499,
        perMonth: 42,
        period: 'year',
        savings: 58,
        badge: 'Best value',
    },
    {
        id: 'monthly',
        label: 'Monthly',
        price: 99,
        perMonth: 99,
        period: 'month',
    },
];

export const DEFAULT_PLAN: PlanId = 'annual';
export const TRIAL_DAYS = 7;

/** Named so a gate reads as a sentence at the call site. */
export type PremiumFeature = 'ai-coach' | 'flashcards' | 'spend-game';

export const FEATURE_COPY: Record<PremiumFeature, { title: string; body: string }> = {
    'ai-coach': {
        title: 'Get your coach back',
        body: 'A fresh read on your score, and the three things worth doing next, written from your own spending.',
    },
    flashcards: {
        title: 'Turn this module into flashcards',
        body: 'Cards written from what you just read, scheduled so the ones you miss come back sooner.',
    },
    'spend-game': {
        title: 'Keep playing',
        body: 'More rounds against your own categories, and the blind spot they add up to.',
    },
};

/** What the free tier still gets, stated plainly so the paywall can be honest. */
export const FREE_ALLOWANCE = {
    /** Coach refreshes per calendar month on the free tier. */
    aiCoachRefreshes: 3,
    /** Flashcard decks generated per calendar month on the free tier. */
    flashcardDecks: 1,
    /** Rounds of the spending game per day on the free tier. */
    spendGameRounds: 5,
};

export const VALUE_PROPS = [
    'Your coach, whenever you want a fresh read',
    'Flashcards from any module, generated on the spot',
    'Unlimited rounds of the spending game',
    'Everything you already have, unchanged',
];
