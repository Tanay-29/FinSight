/**
 * Streak Wager
 *
 * The learner stakes IQ points that they will keep studying for seven days
 * straight. Win and the stake doubles; break the streak and it is gone.
 *
 * The mechanic exists because a self-imposed cost is a stronger commitment than
 * a reminder. It is deliberately small, opt-in, and staked in points that only
 * exist inside the app: no real money is ever at risk, and there is nothing to
 * buy more points with.
 *
 * Pure functions. All state changes go through resolveWager.
 */
import { daysBetween, toDateKey } from './streak';

/** Days the learner must keep the streak alive to win. */
export const WAGER_DAYS = 7;

/** Allowed stakes. Capped so a loss stings without being punishing. */
export const WAGER_STAKES = [25, 50, 100] as const;
export type WagerStake = (typeof WAGER_STAKES)[number];

export type WagerStatus = 'active' | 'won' | 'lost';

export interface StreakWager {
    stake: number;
    /** Streak on the day the wager was placed. */
    startStreak: number;
    /** Streak the learner has to reach. */
    targetStreak: number;
    startedAt: string;
    status: WagerStatus;
    /** Set when the wager finishes. */
    settledAt?: string;
    /** Points won or lost. Positive on a win, negative on a loss. */
    payout?: number;
}

export function createWager(
    stake: number,
    currentStreak: number,
    today: string = toDateKey()
): StreakWager {
    return {
        stake,
        startStreak: currentStreak,
        targetStreak: currentStreak + WAGER_DAYS,
        startedAt: today,
        status: 'active',
    };
}

/**
 * Work out where an active wager stands.
 *
 * Won when the streak reaches the target. Lost when the streak drops below
 * where it started, which only happens on a reset, or when more than the
 * allowed days have passed without reaching the target.
 *
 * A streak saved by a freeze keeps the wager alive, which is intentional: the
 * freeze was earned by studying, so it is not a way of cheating the wager.
 */
export function resolveWager(
    wager: StreakWager,
    currentStreak: number,
    today: string = toDateKey()
): StreakWager {
    if (wager.status !== 'active') return wager;

    if (currentStreak >= wager.targetStreak) {
        return {
            ...wager,
            status: 'won',
            settledAt: today,
            payout: wager.stake,
        };
    }

    const elapsed = daysBetween(wager.startedAt, today);
    const streakBroken = currentStreak < wager.startStreak;
    const ranOutOfTime = elapsed > WAGER_DAYS;

    if (streakBroken || ranOutOfTime) {
        return {
            ...wager,
            status: 'lost',
            settledAt: today,
            payout: -wager.stake,
        };
    }

    return wager;
}

/** Days still to go. Never negative. */
export function daysRemaining(
    wager: StreakWager,
    currentStreak: number
): number {
    return Math.max(0, wager.targetStreak - currentStreak);
}

/** 0 to 100, for the progress bar. */
export function wagerProgress(wager: StreakWager, currentStreak: number): number {
    const gained = currentStreak - wager.startStreak;
    return Math.max(0, Math.min(100, Math.round((gained / WAGER_DAYS) * 100)));
}
