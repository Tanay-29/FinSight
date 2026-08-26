/**
 * Review Service
 *
 * Spaced repetition for flashcards, using the Leitner box system.
 *
 * A card sits in one of five boxes. Answering it correctly promotes it one box
 * and pushes the next review further out; answering it wrong sends it back to
 * box 1, so material the learner does not know comes back quickly and material
 * they do know stops taking up their time.
 *
 * Cards live at users/{uid}/flashcard_reviews/{cardId}. The id is derived from
 * the module and the question text, so regenerating a deck does not lose the
 * history of a card the learner has already seen.
 */
import {
    doc, getDoc, getDocs, setDoc, collection, query, where,
} from 'firebase/firestore';
import { db } from '../config/firebase';

/** Days until the next review, indexed by box number (1 to 5). */
export const BOX_INTERVALS_DAYS: Record<number, number> = {
    1: 1,
    2: 2,
    3: 4,
    4: 7,
    5: 15,
};

export const MAX_BOX = 5;

export interface ReviewCard {
    id: string;
    moduleId: string;
    moduleTitle: string;
    pathId: string;
    question: string;
    answer: string;
    /** Leitner box, 1 (hardest) to 5 (known). */
    box: number;
    /** 'YYYY-MM-DD'. The card is due when this is today or earlier. */
    dueDate: string;
    lastReviewed: string;
    timesCorrect: number;
    timesWrong: number;
}

// ─── Pure scheduling helpers ─────────────────────────────────

/** Local date as 'YYYY-MM-DD'. Uses local time so "today" matches the user. */
export function toDateKey(date: Date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function addDays(days: number, from: Date = new Date()): string {
    const next = new Date(from);
    next.setDate(next.getDate() + days);
    return toDateKey(next);
}

/**
 * Stable id for a card. djb2 over the question, namespaced by module, so the
 * same question in the same module always maps to the same document.
 */
export function buildCardId(moduleId: string, question: string): string {
    let hash = 5381;
    const normalised = question.trim().toLowerCase();
    for (let i = 0; i < normalised.length; i++) {
        hash = ((hash << 5) + hash + normalised.charCodeAt(i)) >>> 0;
    }
    return `${moduleId}_${hash.toString(36)}`;
}

/** Apply one answer to a card's schedule. Pure: no I/O, easy to reason about. */
export function scheduleNext(
    card: Pick<ReviewCard, 'box' | 'timesCorrect' | 'timesWrong'>,
    correct: boolean,
    now: Date = new Date()
): Pick<ReviewCard, 'box' | 'dueDate' | 'lastReviewed' | 'timesCorrect' | 'timesWrong'> {
    const box = correct ? Math.min(card.box + 1, MAX_BOX) : 1;
    return {
        box,
        dueDate: addDays(BOX_INTERVALS_DAYS[box], now),
        lastReviewed: now.toISOString(),
        timesCorrect: card.timesCorrect + (correct ? 1 : 0),
        timesWrong: card.timesWrong + (correct ? 0 : 1),
    };
}

/** A card is due when its date has arrived. */
export function isDue(card: ReviewCard, today: string = toDateKey()): boolean {
    return card.dueDate <= today;
}

// ─── Firestore ───────────────────────────────────────────────

function reviewsCollection(userId: string) {
    return collection(db, 'users', userId, 'flashcard_reviews');
}

/**
 * Record one answer, creating the card on first sight.
 * Returns the stored card so callers can show the new interval.
 */
export async function recordAnswer(
    userId: string,
    input: {
        moduleId: string;
        moduleTitle: string;
        pathId: string;
        question: string;
        answer: string;
    },
    correct: boolean
): Promise<ReviewCard> {
    const id = buildCardId(input.moduleId, input.question);
    const ref = doc(reviewsCollection(userId), id);
    const snap = await getDoc(ref);

    const existing = snap.exists()
        ? (snap.data() as ReviewCard)
        : { box: 1, timesCorrect: 0, timesWrong: 0 };

    const card: ReviewCard = {
        id,
        ...input,
        ...scheduleNext(existing as ReviewCard, correct),
    };

    await setDoc(ref, card, { merge: true });
    return card;
}

/** Every card scheduled for today or earlier. */
export async function getDueCards(userId: string): Promise<ReviewCard[]> {
    const snap = await getDocs(
        query(reviewsCollection(userId), where('dueDate', '<=', toDateKey()))
    );
    return snap.docs.map((d) => ({ ...(d.data() as ReviewCard), id: d.id }));
}

/** Every card, for progress counts on the Learn tab. */
export async function getAllReviewCards(userId: string): Promise<ReviewCard[]> {
    const snap = await getDocs(reviewsCollection(userId));
    return snap.docs.map((d) => ({ ...(d.data() as ReviewCard), id: d.id }));
}
