/**
 * League Service
 *
 * One of only two places where one user reads a document belonging to another,
 * and the only one open to every signed-in user rather than to a small group
 * the reader was invited into (the other is Squad Goals). Treated accordingly.
 *
 * What a league entry contains: a generated alias and a weekly IQ gain. That
 * is the entire schema, and firestore.rules rejects a write carrying anything
 * else, so a future change cannot quietly start publishing names or amounts.
 */
import {
    collection, doc, getDocs, setDoc, query, orderBy, limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { aliasForUid, weekKey, sanitiseGain, LeagueEntry } from '../utils/league';

/** Entries for one week live under leagues/{weekKey}/entries. */
function entriesCollection(week: string) {
    return collection(db, 'leagues', week, 'entries');
}

/**
 * Publish this user's weekly gain.
 *
 * The alias is derived from the uid rather than stored from a name field, so
 * there is no path by which a display name reaches this collection.
 */
export async function publishGain(uid: string, gain: number, week = weekKey()): Promise<void> {
    await setDoc(doc(entriesCollection(week), uid), {
        alias: aliasForUid(uid),
        gain: sanitiseGain(gain),
        updatedAt: new Date().toISOString(),
    });
}

/**
 * Read the current board.
 *
 * Capped at 50 rows: a leaderboard is only motivating near the top and near
 * yourself, and an unbounded read would grow with the user base.
 */
export async function fetchLeague(week = weekKey()): Promise<LeagueEntry[]> {
    const snap = await getDocs(
        query(entriesCollection(week), orderBy('gain', 'desc'), limit(50))
    );
    return snap.docs.map((d) => ({
        uid: d.id,
        alias: (d.data().alias as string) ?? 'Anonymous',
        gain: (d.data().gain as number) ?? 0,
        updatedAt: (d.data().updatedAt as string) ?? '',
    }));
}
