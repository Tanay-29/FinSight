/**
 * Squad Goals
 *
 * A savings goal several people chase together. Everyone contributes towards
 * one shared target and sees how the group is doing.
 *
 * This is the only feature in the app where several users write to the same
 * document tree, so the trust model is worth stating plainly.
 *
 * What crosses between users: a generated alias and a contributed amount.
 * Nothing else. No name, no email, no balances, no transactions. Squad members
 * see each other's uids, because a contribution row is keyed by uid so the
 * rules can check who wrote it. That is the same trade the Improvement League
 * makes, and for the same reason.
 *
 * Amounts are self-reported. Nobody moves real money here and no bank is
 * connected, so a contribution is a claim about saving, not a transfer. A
 * modified client could post a false figure; the cap below bounds how absurd
 * that can get, it does not make the number trustworthy. Verifying it would
 * need a server, which this project deliberately does not have.
 *
 * Membership is by invite code, and the code is the squad's document id. That
 * is deliberate: it means joining is a blind write to a known path rather than
 * a search, so nobody needs read access to a squad before they belong to it.
 */

export interface Squad {
    /** Document id, and the invite code members type to join. */
    code: string;
    name: string;
    targetAmount: number;
    /** ISO date, 'YYYY-MM-DD'. */
    deadline: string;
    ownerUid: string;
    memberUids: string[];
    createdAt: string;
}

export interface Contribution {
    /** Firebase uid. Also the document id. */
    uid: string;
    alias: string;
    amount: number;
    updatedAt: string;
}

/**
 * Codes are typed by hand off a friend's screen, so the alphabet leaves out
 * every character people confuse: no O or 0, no I, L or 1, no S or 5.
 */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRTUVWXYZ2346789';

export const CODE_LENGTH = 8;

/**
 * Eight characters out of a 29 character alphabet.
 *
 * The length is a security parameter, not a cosmetic one. Guessing a code is
 * the only way to reach a squad you were not invited to, and Firestore rules
 * cannot rate limit, so the space has to be large enough that guessing is
 * pointless on its own. Eight characters gives about 5e11 codes, so a thousand
 * attempts a second would still take centuries.
 *
 * Math.random is not a cryptographic generator, which is a fair thing to
 * question here. It holds up because an attacker cannot observe the generator
 * on the device that created the squad: its state is seeded per process and
 * never leaves the phone, so codes cannot be predicted from outside. Brute
 * force over the space above is the only route left, and the length closes it.
 */
export function generateInviteCode(random: () => number = Math.random): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
    }
    return code;
}

/** Accept whatever the user typed: lower case, spaces, the display dash. */
export function normaliseCode(input: string): string {
    return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Split for display, so eight characters stay readable. */
export function formatCode(code: string): string {
    return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function isValidCode(input: string): boolean {
    const code = normaliseCode(input);
    if (code.length !== CODE_LENGTH) return false;
    return [...code].every((c) => CODE_ALPHABET.includes(c));
}

/**
 * A squad is small on purpose. Everyone's contribution row is read on every
 * open, so the cost of a squad grows with its size, and a goal shared by
 * thirty people stops feeling like anyone's responsibility.
 *
 * Mirrored in firestore.rules.
 */
export const MAX_MEMBERS = 8;

/** Mirrored in firestore.rules. See the note on self-reporting above. */
export const MAX_CONTRIBUTION = 10_00_000;

export const MAX_TARGET = 1_00_00_000;

export function sanitiseContribution(amount: number): number {
    if (!Number.isFinite(amount)) return 0;
    return Math.max(0, Math.min(MAX_CONTRIBUTION, Math.round(amount)));
}

export interface SquadProgress {
    /** Sum of every member's contribution. */
    total: number;
    /** 0 to 100, clamped. A squad can overshoot; the bar cannot. */
    percentage: number;
    /** Never negative. */
    remaining: number;
    reached: boolean;
    /** Whole days left, negative once the deadline has passed. */
    daysLeft: number;
    /**
     * What the group still has to put away per day to land on time. Null when
     * the target is already met or the deadline has gone.
     */
    perDayNeeded: number | null;
}

export function computeProgress(
    squad: Pick<Squad, 'targetAmount' | 'deadline'>,
    contributions: Contribution[],
    now: Date = new Date()
): SquadProgress {
    const total = contributions.reduce((sum, c) => sum + sanitiseContribution(c.amount), 0);
    const target = squad.targetAmount > 0 ? squad.targetAmount : 0;

    const remaining = Math.max(0, target - total);
    const reached = target > 0 && total >= target;
    const percentage = target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0;

    const daysLeft = daysUntil(squad.deadline, now);
    const perDayNeeded =
        reached || daysLeft <= 0 ? null : Math.ceil(remaining / daysLeft);

    return { total, percentage, remaining, reached, daysLeft, perDayNeeded };
}

/**
 * Whole days from now until an ISO date, counted in local time.
 *
 * Both sides are floored to midnight first, so a deadline today reads as 0
 * rather than as a fraction that rounds unpredictably.
 */
export function daysUntil(isoDate: string, now: Date = new Date()): number {
    const [y, m, d] = isoDate.split('-').map(Number);
    if (!y || !m || !d) return 0;
    const deadline = new Date(y, m - 1, d).getTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.round((deadline - today) / 86_400_000);
}

export interface RankedContribution extends Contribution {
    rank: number;
    isYou: boolean;
    /** This member's share of what the squad has saved, 0 to 100. */
    share: number;
}

/**
 * Biggest contributor first.
 *
 * Ties share a rank and the next rank skips accordingly, so two members tied
 * at 1 are followed by rank 3. Ties break by alias so the order is stable
 * between renders rather than depending on what order Firestore returned.
 */
export function rankContributions(
    contributions: Contribution[],
    currentUid?: string
): RankedContribution[] {
    const total = contributions.reduce((sum, c) => sum + sanitiseContribution(c.amount), 0);

    const sorted = [...contributions].sort(
        (a, b) => b.amount - a.amount || a.alias.localeCompare(b.alias)
    );

    const ranked: RankedContribution[] = [];
    let lastAmount: number | null = null;
    let lastRank = 0;

    sorted.forEach((entry, i) => {
        const rank = entry.amount === lastAmount ? lastRank : i + 1;
        lastAmount = entry.amount;
        lastRank = rank;
        ranked.push({
            ...entry,
            rank,
            isYou: entry.uid === currentUid,
            share: total > 0 ? Math.round((entry.amount / total) * 100) : 0,
        });
    });

    return ranked;
}

/**
 * Whether a new squad's details are usable.
 *
 * Returns the first problem as a sentence the UI can show, or null when the
 * squad is fine. One message at a time: a form that lists every fault at once
 * reads as nagging.
 */
export function validateSquad(
    name: string,
    targetAmount: number,
    deadline: string,
    now: Date = new Date()
): string | null {
    const trimmed = name.trim();
    if (trimmed.length === 0) return 'Give the squad a name.';
    if (trimmed.length > 40) return 'Keep the name under 40 characters.';

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
        return 'Set a target above zero.';
    }
    if (targetAmount > MAX_TARGET) {
        return 'That target is too large for a squad goal.';
    }

    if (daysUntil(deadline, now) <= 0) {
        return 'Pick a deadline in the future.';
    }

    return null;
}

/** Whether this squad has room for one more member. */
export function hasRoom(squad: Pick<Squad, 'memberUids'>): boolean {
    return squad.memberUids.length < MAX_MEMBERS;
}
