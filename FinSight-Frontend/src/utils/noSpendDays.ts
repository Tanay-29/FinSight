/**
 * No-spend days.
 *
 * A day on which nothing went out. Most money apps have nothing to say about
 * such a day, because there is no transaction to show and no chart to draw, so
 * the day reads as an absence. For a student with little or no income that is
 * most days, which means the app is quiet exactly when the learner is doing the
 * thing it wants.
 *
 * This counts those days and treats them as the win they are.
 *
 * One rule governs everything below: it reports what went well and never what
 * went badly. There is no function here that returns days the learner spent on,
 * no streak that can break, and no run of failures. That is deliberate. A
 * visible record of bad days is a reason not to open the app, and the learner
 * who avoids the app is the one the app was written for.
 */

export interface DayLike {
    /** ISO date, 'YYYY-MM-DD'. Only the first 10 characters are read. */
    date: string;
    type: 'debit' | 'credit';
    amount: number;
}

/** 'YYYY-MM-DD' in local time. */
export function toDayKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Days on which money actually left, as a set of day keys.
 *
 * Credits are ignored: receiving money is not spending. A zero-amount debit is
 * also ignored, since a placeholder row should not cost the learner a good day.
 */
function daysWithSpending(transactions: DayLike[]): Set<string> {
    const days = new Set<string>();
    for (const t of transactions ?? []) {
        if (t?.type !== 'debit') continue;
        const amount = Number(t.amount);
        if (!Number.isFinite(amount) || amount <= 0) continue;
        const key = (t.date ?? '').slice(0, 10);
        if (key.length === 10) days.add(key);
    }
    return days;
}

/** Earliest day key in the history, or null when there is no usable history. */
function earliestRecordedDay(transactions: DayLike[]): string | null {
    let earliest: string | null = null;
    for (const t of transactions ?? []) {
        const key = (t?.date ?? '').slice(0, 10);
        if (key.length !== 10) continue;
        if (earliest === null || key < earliest) earliest = key;
    }
    return earliest;
}

export interface NoSpendSummary {
    /** No-spend days so far this month. */
    thisMonth: number;
    /** Days elapsed this month, so `thisMonth` has a denominator. */
    daysElapsed: number;
    /**
     * Consecutive no-spend days ending today. Zero if money went out today.
     *
     * This is a run, not a streak: it starts again freely and nothing anywhere
     * records that it ended. There is no "longest run you lost".
     */
    currentRun: number;
    /** Best run this month, for encouragement rather than comparison. */
    bestRunThisMonth: number;
    /** True when today has had no spending recorded yet. */
    todayIsClear: boolean;
}

/**
 * Summarise no-spend days for the current month.
 *
 * Counts only days that have actually happened. A month is not scored against
 * days that have not arrived, which would make the first of the month look like
 * a failure.
 */
export function summariseNoSpendDays(
    transactions: DayLike[],
    now: Date = new Date()
): NoSpendSummary {
    const spent = daysWithSpending(transactions);

    const year = now.getFullYear();
    const month = now.getMonth();
    const daysElapsed = now.getDate();

    let thisMonth = 0;
    let bestRunThisMonth = 0;
    let running = 0;

    for (let day = 1; day <= daysElapsed; day++) {
        const key = toDayKey(new Date(year, month, day));
        if (spent.has(key)) {
            running = 0;
        } else {
            thisMonth++;
            running++;
            if (running > bestRunThisMonth) bestRunThisMonth = running;
        }
    }

    // The current run may reach back past the first of the month, so walk
    // backwards from today rather than reusing the in-month counter.
    //
    // It stops at the earliest day we have any record for. Without that bound a
    // learner with no history at all would be told they had a run stretching
    // back years, which is flattery rather than a fact: the app cannot vouch for
    // days it was not there for. With no records, the month start is the honest
    // floor.
    const earliest = earliestRecordedDay(transactions) ?? toDayKey(new Date(year, month, 1));
    let currentRun = 0;
    for (let back = 0; back < 400; back++) {
        const d = new Date(year, month, daysElapsed - back);
        const key = toDayKey(d);
        if (spent.has(key) || key < earliest) break;
        currentRun++;
    }

    return {
        thisMonth,
        daysElapsed,
        currentRun,
        bestRunThisMonth,
        todayIsClear: !spent.has(toDayKey(now)),
    };
}

/**
 * One short line about the summary, for the card.
 *
 * Written to the same rule as the rest of the module: it celebrates or it stays
 * neutral, and it never implies the learner was expected to fail. There is no
 * branch that scolds, because there is no input that should produce one.
 */
export function noSpendMessage(summary: NoSpendSummary): string {
    const { thisMonth, currentRun, todayIsClear } = summary;

    if (currentRun >= 3) {
        return `${currentRun} days running with nothing out. That adds up.`;
    }
    if (todayIsClear && currentRun >= 1) {
        return 'Nothing out today. Those days count more than people think.';
    }
    if (thisMonth >= 10) {
        return `${thisMonth} clear days this month. Quietly good going.`;
    }
    if (thisMonth >= 1) {
        return `${thisMonth} clear day${thisMonth === 1 ? '' : 's'} this month so far.`;
    }
    // Zero is not a failure and is not described as one.
    return 'A day with nothing going out counts here. They add up.';
}
