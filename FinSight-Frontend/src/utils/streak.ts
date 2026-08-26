/**
 * Streak and Streak Freeze
 *
 * A streak counts consecutive days with at least one completed module. Missing
 * a day normally resets it to 1, which is the single most demoralising moment
 * in any learning app and the point where people quit.
 *
 * A freeze absorbs one missed day. Freezes are earned by studying, so the
 * protection is something the learner built up rather than a handout, and they
 * are spent automatically: nobody should have to remember to arm a shield.
 *
 * Pure functions, no I/O, so the rules can be tested directly.
 */

/** Most freezes a learner can bank. Beyond this the streak stops meaning much. */
export const MAX_FREEZES = 3;

/** Freezes earned per module completed. */
export const FREEZE_PER_MODULE = 1;

export interface StreakState {
    streak: number;
    /** 'YYYY-MM-DD' of the last day a module was completed. */
    lastStudiedDate: string;
    freezes: number;
}

export interface StreakUpdate extends StreakState {
    /** How many freezes this update consumed. Drives the UI message. */
    freezesUsed: number;
    /** True when the streak survived only because a freeze was spent. */
    savedByFreeze: boolean;
    /** True when the gap was too long to cover and the streak reset. */
    streakReset: boolean;
}

/** Local date as 'YYYY-MM-DD'. */
export function toDateKey(date: Date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Whole days between two date keys. Negative if `to` precedes `from`. */
export function daysBetween(from: string, to: string): number {
    const a = new Date(`${from}T00:00:00`);
    const b = new Date(`${to}T00:00:00`);
    return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Apply one day of study to a streak.
 *
 * Rules, in order:
 *   same day again      streak unchanged, no freeze spent, no freeze earned
 *   next day            streak + 1
 *   gap, freezes cover  streak + 1, one freeze per missed day
 *   gap, cannot cover   streak resets to 1, freezes untouched
 *
 * A freeze earned by this session cannot pay for the gap this session, so the
 * freeze count used is always the balance the learner arrived with.
 */
export function applyStudyDay(
    state: StreakState,
    today: string = toDateKey()
): StreakUpdate {
    const { streak, lastStudiedDate, freezes } = state;

    // First ever session.
    if (!lastStudiedDate) {
        return {
            streak: 1,
            lastStudiedDate: today,
            freezes: Math.min(freezes + FREEZE_PER_MODULE, MAX_FREEZES),
            freezesUsed: 0,
            savedByFreeze: false,
            streakReset: false,
        };
    }

    const gap = daysBetween(lastStudiedDate, today);

    // Already studied today. Nothing changes, and no second freeze is earned.
    if (gap <= 0) {
        return {
            streak,
            lastStudiedDate,
            freezes,
            freezesUsed: 0,
            savedByFreeze: false,
            streakReset: false,
        };
    }

    const earn = (f: number) => Math.min(f + FREEZE_PER_MODULE, MAX_FREEZES);

    // Consecutive day.
    if (gap === 1) {
        return {
            streak: streak + 1,
            lastStudiedDate: today,
            freezes: earn(freezes),
            freezesUsed: 0,
            savedByFreeze: false,
            streakReset: false,
        };
    }

    // Gap. One freeze covers one missed day.
    const missedDays = gap - 1;
    if (freezes >= missedDays) {
        return {
            streak: streak + 1,
            lastStudiedDate: today,
            freezes: earn(freezes - missedDays),
            freezesUsed: missedDays,
            savedByFreeze: true,
            streakReset: false,
        };
    }

    // Too long a gap. Freezes are kept rather than burned for nothing.
    return {
        streak: 1,
        lastStudiedDate: today,
        freezes: earn(freezes),
        freezesUsed: 0,
        savedByFreeze: false,
        streakReset: true,
    };
}

/**
 * Whether the streak is already broken as of today, without studying.
 * Used to show an at-risk warning on the Learn tab.
 */
export function streakAtRisk(state: StreakState, today: string = toDateKey()): boolean {
    if (!state.lastStudiedDate || state.streak === 0) return false;
    return daysBetween(state.lastStudiedDate, today) >= 1;
}
