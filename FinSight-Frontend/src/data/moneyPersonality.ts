/**
 * Money Personality
 *
 * Eight situational questions that sort a learner into one of five money
 * archetypes. The point is not psychometric rigour: it is a two-minute hook
 * that gives the app something real to personalise on before the learner has
 * logged a single transaction, and gives the coach a voice to speak in.
 *
 * Scoring is a pure function so the mapping can be tested and reasoned about
 * without touching the UI.
 */

export type ArchetypeId =
    | 'planner'
    | 'saver'
    | 'spender'
    | 'avoider'
    | 'risktaker';

export interface Archetype {
    id: ArchetypeId;
    name: string;
    tagline: string;
    description: string;
    /** What this person tends to do well. */
    strength: string;
    /** The trap this person falls into. */
    watchOut: string;
    /** One concrete thing to do next, phrased as an action. */
    firstStep: string;
    /** Lucide icon key, resolved in the UI. */
    icon: string;
    color: string;
    /** Learning path promoted for this archetype. */
    recommendedPathId: string;
}

export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
    planner: {
        id: 'planner',
        name: 'The Architect',
        tagline: 'You build the spreadsheet before you spend the rupee',
        description:
            'You like knowing where money is going before it goes there. Budgets feel comforting rather than restrictive, and you would rather research an option for a week than decide in a day.',
        strength: 'You rarely get caught out by a bill you forgot about.',
        watchOut:
            'Planning can become a substitute for acting. A perfect plan you never start beats nothing, but only barely.',
        firstStep: 'Set one budget category and let it run untouched for a month.',
        icon: 'planner',
        color: '#6366F1',
        recommendedPathId: 'budgetBasics',
    },
    saver: {
        id: 'saver',
        name: 'The Squirrel',
        tagline: 'Money in the account is money doing its job',
        description:
            'Saving comes naturally. You feel the balance dropping more sharply than most people do, and you would rather go without than dip into your buffer.',
        strength: 'You already have the habit most people spend years building.',
        watchOut:
            'Cash sitting still loses to inflation every year. Safety past a point is its own kind of risk.',
        firstStep: 'Work out how many months of expenses you hold, and invest anything past six.',
        icon: 'saver',
        color: '#10B981',
        recommendedPathId: 'investing101',
    },
    spender: {
        id: 'spender',
        name: 'The Experience Collector',
        tagline: 'Money is for living, and you intend to live',
        description:
            'You would rather have the trip than the balance. Spending on people and experiences feels obviously right to you, and restraint feels like missing out.',
        strength: 'You actually enjoy your money, which is more than many people manage.',
        watchOut:
            'Small frequent spends are invisible in the moment and enormous in the monthly total.',
        firstStep: 'Track every spend for one week without changing anything, then look at the total.',
        icon: 'spender',
        color: '#F59E0B',
        recommendedPathId: 'budgetBasics',
    },
    avoider: {
        id: 'avoider',
        name: 'The Ostrich',
        tagline: 'The balance is fine if you do not look at it',
        description:
            'Money admin makes you tense, so it gets postponed. You are not careless, you would just rather deal with it later, and later keeps moving.',
        strength: 'You are honest about finding this stuff stressful, which most people hide.',
        watchOut:
            'Avoidance compounds faster than interest does. The longer a problem is unlooked at, the larger it gets.',
        firstStep: 'Open the app once a day for a week. Do nothing else. Just look.',
        icon: 'avoider',
        color: '#8B5CF6',
        recommendedPathId: 'budgetBasics',
    },
    risktaker: {
        id: 'risktaker',
        name: 'The Punter',
        tagline: 'Fortune favours the bold, and you agree loudly',
        description:
            'Volatility reads as opportunity to you. You would rather take a swing at something with real upside than accept a guaranteed small return.',
        strength: 'You start investing early, which matters more than picking well.',
        watchOut:
            'Concentration is what ruins people, not risk itself. One bad position can undo years.',
        firstStep: 'Check what share of your portfolio sits in a single asset.',
        icon: 'risktaker',
        color: '#EF4444',
        recommendedPathId: 'investing101',
    },
};

export interface QuizOption {
    text: string;
    /** Archetype weights. Two archetypes per option keeps results from being obvious. */
    weights: Partial<Record<ArchetypeId, number>>;
}

export interface PersonalityQuestion {
    id: string;
    question: string;
    options: QuizOption[];
}

export const PERSONALITY_QUESTIONS: PersonalityQuestion[] = [
    {
        id: 'q1',
        question: 'Your friend asks you to split a surprise weekend trip. It costs about a week of your usual spending. What happens?',
        options: [
            { text: 'I check the budget first, then decide', weights: { planner: 2, saver: 1 } },
            { text: 'I am already packing', weights: { spender: 2, risktaker: 1 } },
            { text: 'I say yes, then quietly worry about it', weights: { avoider: 2, spender: 1 } },
            { text: 'I say no. That money has a job already', weights: { saver: 2, planner: 1 } },
        ],
    },
    {
        id: 'q2',
        question: 'How often do you actually look at your bank balance?',
        options: [
            { text: 'Most days, I like knowing', weights: { planner: 2, saver: 1 } },
            { text: 'When the app reminds me', weights: { spender: 1, avoider: 1 } },
            { text: 'Only when a payment fails', weights: { avoider: 3 } },
            { text: 'Constantly, and I track it in a sheet', weights: { planner: 3 } },
        ],
    },
    {
        id: 'q3',
        question: 'You get ₹50,000 unexpectedly. First instinct?',
        options: [
            { text: 'Straight into savings, untouched', weights: { saver: 3 } },
            { text: 'Invest it, it should be working', weights: { risktaker: 2, planner: 1 } },
            { text: 'Something I have wanted for ages', weights: { spender: 3 } },
            { text: 'Leave it in the account and decide later', weights: { avoider: 2, saver: 1 } },
        ],
    },
    {
        id: 'q4',
        question: 'An investment you hold drops 20% in a week. You:',
        options: [
            { text: 'Buy more, it is cheaper now', weights: { risktaker: 3 } },
            { text: 'Sell, I cannot watch this', weights: { saver: 2, avoider: 1 } },
            { text: 'Check whether my reasons for buying still hold', weights: { planner: 3 } },
            { text: 'Stop opening the app', weights: { avoider: 3 } },
        ],
    },
    {
        id: 'q5',
        question: 'How do you feel about the phrase "monthly budget"?',
        options: [
            { text: 'Comforting. I know where I stand', weights: { planner: 2, saver: 1 } },
            { text: 'Restrictive. Life is not a spreadsheet', weights: { spender: 2, risktaker: 1 } },
            { text: 'Guilty. I keep meaning to make one', weights: { avoider: 3 } },
            { text: 'Unnecessary. I just do not spend much', weights: { saver: 3 } },
        ],
    },
    {
        id: 'q6',
        question: 'Your card gets declined at a shop. What is the most likely reason?',
        options: [
            { text: 'It would not be. I know my balance', weights: { planner: 2, saver: 2 } },
            { text: 'I lost track this month', weights: { spender: 2, avoider: 2 } },
            { text: 'Money is tied up in investments', weights: { risktaker: 3 } },
            { text: 'Honestly, it could be anything', weights: { avoider: 3 } },
        ],
    },
    {
        id: 'q7',
        question: 'Which sentence sounds most like you?',
        options: [
            { text: 'I would rather have security than upside', weights: { saver: 3 } },
            { text: 'I would rather have upside than security', weights: { risktaker: 3 } },
            { text: 'I would rather have the experience than either', weights: { spender: 3 } },
            { text: 'I would rather not think about it right now', weights: { avoider: 3 } },
        ],
    },
    {
        id: 'q8',
        question: 'Ten years out, what would make you feel you had done well?',
        options: [
            { text: 'A number in an account I can point to', weights: { saver: 2, planner: 1 } },
            { text: 'A portfolio that grew faster than the market', weights: { risktaker: 3 } },
            { text: 'A phone full of places I have been', weights: { spender: 3 } },
            { text: 'Simply not being stressed about money', weights: { avoider: 2, saver: 1 } },
        ],
    },
];

export interface PersonalityResult {
    archetype: ArchetypeId;
    /** Raw totals per archetype, kept so the result can be explained. */
    scores: Record<ArchetypeId, number>;
    /** 0 to 100. How far ahead the winner is; low means a mixed profile. */
    confidence: number;
    /** Second place, shown as "with a streak of ...". */
    runnerUp: ArchetypeId | null;
}

const ARCHETYPE_IDS: ArchetypeId[] = ['planner', 'saver', 'spender', 'avoider', 'risktaker'];

/**
 * Score a completed quiz.
 *
 * `answers` maps question id to the index of the chosen option. Unanswered or
 * invalid entries are ignored rather than throwing, so a partial quiz still
 * produces a usable result.
 *
 * Ties break by the fixed archetype order, so the same answers always give the
 * same result.
 */
export function scorePersonality(answers: Record<string, number>): PersonalityResult {
    const scores = ARCHETYPE_IDS.reduce(
        (acc, id) => ({ ...acc, [id]: 0 }),
        {} as Record<ArchetypeId, number>
    );

    for (const question of PERSONALITY_QUESTIONS) {
        const choice = answers[question.id];
        const option = question.options[choice];
        if (!option) continue;
        for (const [id, weight] of Object.entries(option.weights)) {
            scores[id as ArchetypeId] += weight ?? 0;
        }
    }

    const ranked = [...ARCHETYPE_IDS].sort((a, b) => scores[b] - scores[a]);
    const winner = ranked[0];
    const second = ranked[1];

    const total = ARCHETYPE_IDS.reduce((sum, id) => sum + scores[id], 0);
    // Confidence is the winner's lead over second place, as a share of the
    // total. A runaway result approaches 100, a dead heat gives 0.
    const confidence = total === 0
        ? 0
        : Math.round(((scores[winner] - scores[second]) / total) * 100 * 2.5);

    return {
        archetype: winner,
        scores,
        confidence: Math.max(0, Math.min(100, confidence)),
        runnerUp: scores[second] > 0 && second !== winner ? second : null,
    };
}

/** Stored on the user profile. */
export interface MoneyPersonality {
    archetype: ArchetypeId;
    scores: Record<ArchetypeId, number>;
    confidence: number;
    takenAt: string;
}
