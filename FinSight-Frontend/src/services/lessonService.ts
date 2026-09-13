/**
 * Lesson Service
 *
 * The mistake bank. Every scorable card a learner answers gets one document
 * at users/{uid}/lesson_cards/{key}, scheduled with the same Leitner boxes
 * the flashcards use (reviewService.scheduleNext), so a card missed today
 * comes back tomorrow and a card known cold drifts out to fifteen days.
 *
 * Lesson completion itself is not stored here. It goes through
 * firestoreService.markModuleComplete with the track as the path, which is
 * what already drives the streak, the freeze bank and the badge, and means a
 * finished lesson counts as a study day exactly like a finished module.
 */
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { scheduleNext, toDateKey } from './reviewService';

export interface CardResult {
    /** lessonId__cardId, see data/lessons/index.ts cardKey. */
    key: string;
    trackId: string;
    lessonId: string;
    box: number;
    dueDate: string;
    lastReviewed: string;
    timesCorrect: number;
    timesWrong: number;
}

/** Answered right at least twice and sitting above the first two boxes. */
export function isMastered(r: CardResult): boolean {
    return r.timesCorrect >= 2 && r.box >= 3;
}

export function isDueForReview(r: CardResult, today: string = toDateKey()): boolean {
    return r.dueDate <= today;
}

function cardsCollection(userId: string) {
    return collection(db, 'users', userId, 'lesson_cards');
}

export async function getCardResults(userId: string): Promise<Record<string, CardResult>> {
    const snap = await getDocs(cardsCollection(userId));
    const out: Record<string, CardResult> = {};
    snap.docs.forEach((d) => { out[d.id] = { ...(d.data() as CardResult), key: d.id }; });
    return out;
}

export async function recordCardResult(
    userId: string,
    input: { key: string; trackId: string; lessonId: string },
    correct: boolean,
): Promise<CardResult> {
    const ref = doc(cardsCollection(userId), input.key);
    const snap = await getDoc(ref);
    const existing = snap.exists()
        ? (snap.data() as CardResult)
        : { box: 1, timesCorrect: 0, timesWrong: 0 };
    const next: CardResult = {
        ...input,
        ...scheduleNext(existing as CardResult, correct),
    };
    await setDoc(ref, next, { merge: true });
    return next;
}
