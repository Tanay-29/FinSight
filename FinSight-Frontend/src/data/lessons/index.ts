/**
 * Every lesson track, validated once at import.
 *
 * Tracks are ordered by life stage: the thing you need in the month you get
 * an offer letter comes before the thing you need when a card arrives.
 */
import { validateTracks, Track, Lesson, Card } from './schema';
import { STUDENT } from './student';
import { FIRST_JOB } from './firstJob';
import { FIRST_CREDIT } from './firstCredit';
import { PROTECT } from './protect';
import { GROW } from './grow';
import { LIVE } from './live';

export const TRACKS: Track[] = validateTracks([STUDENT, FIRST_JOB, FIRST_CREDIT, PROTECT, GROW, LIVE]);

export function findTrack(trackId: string): Track | undefined {
    return TRACKS.find((t) => t.id === trackId);
}

export function findLesson(trackId: string, lessonId: string): Lesson | undefined {
    return findTrack(trackId)?.lessons.find((l) => l.id === lessonId);
}

/** Global key for a card, used by the mistake bank. */
export function cardKey(lessonId: string, cardId: string): string {
    return `${lessonId}__${cardId}`;
}

export interface LocatedCard {
    trackId: string;
    lessonId: string;
    lessonTitle: string;
    card: Card;
}

/** Look a card up by its mistake-bank key. */
export function locateCard(key: string): LocatedCard | undefined {
    const [lessonId, cardId] = key.split('__');
    for (const t of TRACKS) {
        for (const l of t.lessons) {
            if (l.id !== lessonId) continue;
            const card = l.cards.find((c) => c.id === cardId);
            if (card) return { trackId: t.id, lessonId: l.id, lessonTitle: l.title, card };
        }
    }
    return undefined;
}

export type { Track, Lesson, Card };
