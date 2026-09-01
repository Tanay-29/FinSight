/**
 * Rounds for the spending comparison game.
 *
 * The game used to ask for a number: "how much have you spent this month?"
 * That question has no anchor. Nobody can tell whether 5,000 is a reasonable
 * guess for their own month, being 300 out teaches nothing you can act on, and
 * a new account has no total worth guessing at all.
 *
 * A comparison is answerable. "Dining or transport, which was more?" has a
 * right answer, you either hold that belief or you do not, and being wrong
 * names the exact blind spot rather than handing you an accuracy percentage.
 *
 * What the game is really testing is the well-documented habit of
 * underestimating small, frequent spending against large, memorable spending:
 * one 900 rupee order is easy to recall, thirty 60 rupee chai runs are not.
 * So the reveal always shows the number of purchases beside the total, since
 * that is the part people are wrong about.
 */
import { normaliseCategory, categoryLabel, Category } from './categories';

export interface CategoryTotal {
    key: Category;
    label: string;
    amount: number;
    /** How many separate purchases made up the total. */
    count: number;
}

export interface QuizRound {
    left: CategoryTotal;
    right: CategoryTotal;
}

/** Debits only, inside the window. Income is not a spending category. */
export function categoryTotals(
    transactions: { type: string; category: string; amount: number; date: string }[],
    windowDays = 30,
): CategoryTotal[] {
    const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    const totals = new Map<Category, { amount: number; count: number }>();

    for (const t of transactions) {
        if (t.type !== 'debit') continue;
        const at = new Date(t.date).getTime();
        if (!Number.isFinite(at) || at < cutoff) continue;

        const key = normaliseCategory(t.category);
        const entry = totals.get(key) ?? { amount: 0, count: 0 };
        entry.amount += t.amount || 0;
        entry.count += 1;
        totals.set(key, entry);
    }

    return [...totals.entries()]
        .filter(([, v]) => v.amount > 0)
        .map(([key, v]) => ({ key, label: categoryLabel(key), amount: v.amount, count: v.count }))
        .sort((a, b) => b.amount - a.amount);
}

/**
 * A pair is worth asking only if the answer is neither obvious nor a toss-up.
 *
 * Below this ratio the two are close enough that getting it wrong says nothing
 * about the player, and a coin flip dressed as a question is worse than no
 * question.
 */
const MIN_RATIO = 1.15;

/**
 * Above this the larger category is usually the one they remember anyway, so
 * the round is free and teaches nothing. Pairs this lopsided are used only
 * when there is nothing better available.
 */
const MAX_INTERESTING_RATIO = 6;

const ratio = (a: CategoryTotal, b: CategoryTotal) =>
    Math.max(a.amount, b.amount) / Math.max(Math.min(a.amount, b.amount), 1);

/**
 * Build up to `count` rounds, best pairs first, no category pair repeated.
 *
 * Preference order is: interesting pairs, then lopsided ones, and ties are
 * dropped entirely. Returns fewer rounds than asked for rather than padding
 * with pairs that cannot teach anything, and an empty array when the account
 * has fewer than two categories to compare.
 */
export function buildRounds(totals: CategoryTotal[], count = 5): QuizRound[] {
    if (totals.length < 2) return [];

    const pairs: { left: CategoryTotal; right: CategoryTotal; r: number }[] = [];
    for (let i = 0; i < totals.length; i++) {
        for (let j = i + 1; j < totals.length; j++) {
            const r = ratio(totals[i], totals[j]);
            if (r < MIN_RATIO) continue;
            pairs.push({ left: totals[i], right: totals[j], r });
        }
    }
    if (pairs.length === 0) return [];

    // Interesting pairs first; within each band, shuffle so the same account
    // does not get the same five questions in the same order every time.
    const interesting = shuffle(pairs.filter((p) => p.r <= MAX_INTERESTING_RATIO));
    const lopsided = shuffle(pairs.filter((p) => p.r > MAX_INTERESTING_RATIO));

    return [...interesting, ...lopsided]
        .slice(0, count)
        .map(({ left, right }) =>
            // Which side the bigger category lands on is randomised, or the
            // answer is always the same button.
            Math.random() < 0.5 ? { left, right } : { left: right, right: left }
        );
}

function shuffle<T>(items: T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/** The category the player wrongly thought was smaller. */
export function blindSpot(rounds: QuizRound[], answers: (CategoryTotal | null)[]): CategoryTotal | null {
    let worst: CategoryTotal | null = null;
    let worstGap = 0;

    rounds.forEach((round, i) => {
        const picked = answers[i];
        if (!picked) return;
        const truth = round.left.amount >= round.right.amount ? round.left : round.right;
        if (picked.key === truth.key) return;

        // They were wrong, so `truth` is the one they underrated.
        const gap = truth.amount - picked.amount;
        if (gap > worstGap) {
            worstGap = gap;
            worst = truth;
        }
    });

    return worst;
}

/** Purchases per rupee is the shape of the "many small buys" habit. */
export function averagePurchase(total: CategoryTotal): number {
    return total.count > 0 ? total.amount / total.count : 0;
}
