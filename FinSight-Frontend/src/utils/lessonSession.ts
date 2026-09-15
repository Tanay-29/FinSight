/**
 * Builds the daily session.
 *
 * The session is what the Learn tab exists to get you to open tomorrow. It
 * is short by design, three minutes, and mixed by design, so no single day
 * is a wall of one thing:
 *
 *   1. up to two cards from the mistake bank that are due today, worst first
 *   2. the next three unseen cards from the lesson you are on
 *   3. one card built from your own transactions (utils/yourMoney.ts),
 *      rotating through six kinds by day, if the data supports one
 *
 * Everything here is pure: given the content, the mistake bank, the
 * completed lessons and the transactions, it returns the same deck. The
 * player does not know or care which rule produced a card.
 */
import { TRACKS, cardKey, locateCard } from '../data/lessons';
import type { Card } from '../data/lessons/schema';
import { isScorable } from '../data/lessons/schema';
import type { CardResult } from '../services/lessonService';
import { isDueForReview } from '../services/lessonService';
import { buildYourMoneyCard } from './yourMoney';

export type SessionKind = 'review' | 'new' | 'yourMoney';

export interface SessionCard {
    kind: SessionKind;
    trackId: string;
    lessonId: string;
    lessonTitle: string;
    card: Card;
    /** Mistake-bank key. Absent for cards that should not be recorded. */
    key?: string;
}

export interface SessionPlan {
    cards: SessionCard[];
    reviewCount: number;
    newCount: number;
    hasYourMoney: boolean;
    /** The lesson the new cards came from, so finishing can advance it. */
    lesson?: { trackId: string; lessonId: string; total: number; completesLesson: boolean };
}

interface Txn { type: string; category: string; amount: number; date: string }

const REVIEW_MAX = 2;
const NEW_MAX = 3;

/** The first lesson, in track order, that is not complete. */
export function nextLesson(completedByTrack: Record<string, string[]>) {
    for (const t of TRACKS) {
        const done = new Set(completedByTrack[t.id] ?? []);
        for (const l of t.lessons) {
            if (!done.has(l.id)) return { track: t, lesson: l };
        }
    }
    return undefined;
}

export function buildSession(
    results: Record<string, CardResult>,
    completedByTrack: Record<string, string[]>,
    transactions: Txn[],
    today?: string,
    incomeRange?: string,
): SessionPlan {
    const cards: SessionCard[] = [];

    // 1. Due reviews, lowest box first, then most-wrong.
    const due = Object.values(results)
        .filter((r) => isDueForReview(r, today))
        .sort((x, y) => x.box - y.box || y.timesWrong - x.timesWrong)
        .slice(0, REVIEW_MAX);
    for (const r of due) {
        const loc = locateCard(r.key);
        if (!loc) continue;
        cards.push({ kind: 'review', trackId: loc.trackId, lessonId: loc.lessonId, lessonTitle: loc.lessonTitle, card: loc.card, key: r.key });
    }

    // 2. New cards from the current lesson. Info cards ride along free so a
    //    question never arrives without the card that set it up.
    let lessonMeta: SessionPlan['lesson'];
    const next = nextLesson(completedByTrack);
    if (next) {
        const seen = (c: Card) => Boolean(results[cardKey(next.lesson.id, c.id)]);
        let scorableTaken = 0;
        let lastIndex = -1;
        for (let i = 0; i < next.lesson.cards.length && scorableTaken < NEW_MAX; i++) {
            const c = next.lesson.cards[i];
            if (isScorable(c) && seen(c)) continue;
            const scorable = isScorable(c);
            // Skip an info card the learner has already moved past.
            if (!scorable && next.lesson.cards.slice(i + 1).some((later) => isScorable(later) && seen(later))) continue;
            cards.push({
                kind: 'new',
                trackId: next.track.id,
                lessonId: next.lesson.id,
                lessonTitle: next.lesson.title,
                card: c,
                key: scorable ? cardKey(next.lesson.id, c.id) : undefined,
            });
            if (scorable) scorableTaken += 1;
            lastIndex = i;
        }
        const remainingAfter = next.lesson.cards.slice(lastIndex + 1).some((c) => isScorable(c) && !seen(c));
        lessonMeta = {
            trackId: next.track.id,
            lessonId: next.lesson.id,
            total: next.track.lessons.length,
            completesLesson: lastIndex >= 0 && !remainingAfter,
        };
    }

    // 3. One card from their own money.
    const ym = buildYourMoneyCard(transactions, incomeRange);
    if (ym) {
        cards.push({ kind: 'yourMoney', trackId: 'you', lessonId: 'you', lessonTitle: 'Your money', card: ym });
    }

    return {
        cards,
        reviewCount: due.length,
        newCount: cards.filter((c) => c.kind === 'new' && c.key).length,
        hasYourMoney: Boolean(ym),
        lesson: lessonMeta,
    };
}
