/**
 * Improvement League
 *
 * A weekly leaderboard ranked on IQ points *gained* this week, not on the
 * score you hold. That distinction is the whole design: ranking students by
 * absolute financial position would put whoever has the most money on top,
 * which teaches nothing and shames the rest. Ranking by improvement means a
 * learner starting from nothing can win.
 *
 * What gets published: a generated alias and a weekly gain. Nothing else. No
 * name, no email, no balances, no transactions.
 *
 * Privacy note, stated plainly: entries are keyed by Firebase uid so the
 * security rules can verify that a learner only writes their own row. Any
 * signed-in user of this app can therefore see the set of uids taking part
 * alongside their aliases and weekly gains. A uid is an opaque identifier that
 * cannot be used to sign in as someone or to look up their details, and no
 * personal or financial data is published, but it is exposure and it is worth
 * knowing about before turning this on.
 */

const ADJECTIVES = [
    'Swift', 'Quiet', 'Bold', 'Clever', 'Steady', 'Bright', 'Nimble', 'Calm',
    'Keen', 'Brave', 'Sharp', 'Patient', 'Curious', 'Lucky', 'Humble', 'Eager',
];

const ANIMALS = [
    'Otter', 'Falcon', 'Panda', 'Tiger', 'Heron', 'Fox', 'Ibex', 'Marten',
    'Gecko', 'Wolf', 'Crane', 'Lynx', 'Bison', 'Osprey', 'Badger', 'Hare',
];

/** djb2. Small, stable, and good enough for picking a name. */
function hash(input: string): number {
    let h = 5381;
    for (let i = 0; i < input.length; i++) {
        h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
    }
    return h;
}

/**
 * A stable, non-identifying display name for a learner.
 *
 * Derived from the uid so it never changes between weeks, which lets people
 * recognise a rival without anyone learning who they are.
 */
export function aliasForUid(uid: string): string {
    const h = hash(uid);
    const adjective = ADJECTIVES[h % ADJECTIVES.length];
    const animal = ANIMALS[Math.floor(h / ADJECTIVES.length) % ANIMALS.length];
    return `${adjective} ${animal}`;
}

/**
 * ISO-8601 week key, for example '2026-W32'.
 *
 * ISO weeks start on Monday and week 1 is the one containing the first
 * Thursday of the year. Using the ISO definition rather than a homemade one
 * matters because every learner has to land in the same bucket.
 */
export function weekKey(date: Date = new Date()): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    // Shift to the Thursday of this week: ISO weeks are numbered by it.
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);

    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);

    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Monday of the week a date falls in, as 'YYYY-MM-DD'. */
export function weekStart(date: Date = new Date()): string {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Whole days until the league resets. */
export function daysUntilReset(date: Date = new Date()): number {
    const day = date.getDay() || 7;
    return 8 - day;
}

export interface LeagueEntry {
    /** Firebase uid. Also the document id. */
    uid: string;
    alias: string;
    /** IQ points gained since the week began. */
    gain: number;
    updatedAt: string;
}

export interface RankedEntry extends LeagueEntry {
    rank: number;
    isYou: boolean;
}

/**
 * Highest gain first. Ties share a rank, and the next rank skips accordingly,
 * so two learners tied at 1 are followed by rank 3.
 *
 * Ties break by alias so the order is stable between renders rather than
 * depending on whatever order Firestore returned.
 */
export function rankEntries(entries: LeagueEntry[], currentUid?: string): RankedEntry[] {
    const sorted = [...entries].sort(
        (a, b) => b.gain - a.gain || a.alias.localeCompare(b.alias)
    );

    const ranked: RankedEntry[] = [];
    let lastGain: number | null = null;
    let lastRank = 0;

    sorted.forEach((entry, i) => {
        const rank = entry.gain === lastGain ? lastRank : i + 1;
        lastGain = entry.gain;
        lastRank = rank;
        ranked.push({ ...entry, rank, isYou: entry.uid === currentUid });
    });

    return ranked;
}

/**
 * Largest gain a single week can record.
 *
 * Mirrored in firestore.rules. The client computes its own gain, so a modified
 * client could submit a false number: this cap bounds how absurd that can get,
 * it does not make the board trustworthy. Verifying gains properly needs a
 * server recomputing the score, which this project deliberately does not have.
 */
export const MAX_WEEKLY_GAIN = 1000;

/** Clamp a gain to something the rules will accept. */
export function sanitiseGain(gain: number): number {
    if (!Number.isFinite(gain)) return 0;
    return Math.max(0, Math.min(MAX_WEEKLY_GAIN, Math.round(gain)));
}
