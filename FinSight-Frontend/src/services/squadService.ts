/**
 * Squad Service
 *
 * Squads live at the top level rather than under a user, because no single
 * user owns the data: several people read and write one tree. See utils/squad
 * for the trust model and firestore.rules for what each write is allowed to
 * touch.
 *
 * The invite code is the document id. Joining is therefore a blind update to a
 * known path, which is what lets the read rule stay strictly members-only: a
 * joiner never has to read a squad to get into it.
 */
import {
    collection, doc, deleteDoc, getDoc, getDocs, setDoc, updateDoc,
    query, where, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { aliasForUid } from '../utils/league';
import {
    Squad, Contribution, generateInviteCode, normaliseCode, sanitiseContribution,
} from '../utils/squad';

function squadRef(code: string) {
    return doc(db, 'squads', code);
}

function contributionsCollection(code: string) {
    return collection(db, 'squads', code, 'contributions');
}

/**
 * Create a squad and put the creator in it.
 *
 * Retries on a code collision rather than trusting the first draw. A collision
 * is vanishingly unlikely at this code length, but the failure mode if one
 * happened would be writing over someone else's squad, so it is worth the
 * three lines. `getDoc` here is allowed because the creator is not yet blocked
 * by the members-only read rule: the document does not exist.
 */
export async function createSquad(
    uid: string,
    name: string,
    targetAmount: number,
    deadline: string
): Promise<Squad> {
    let code = generateInviteCode();
    for (let attempt = 0; attempt < 3; attempt++) {
        const existing = await getDoc(squadRef(code));
        if (!existing.exists()) break;
        code = generateInviteCode();
    }

    const squad: Squad = {
        code,
        name: name.trim(),
        targetAmount: Math.round(targetAmount),
        deadline,
        ownerUid: uid,
        memberUids: [uid],
        createdAt: new Date().toISOString(),
    };

    // `code` is the document id, so it is not repeated in the body.
    await setDoc(squadRef(code), {
        name: squad.name,
        targetAmount: squad.targetAmount,
        deadline: squad.deadline,
        ownerUid: squad.ownerUid,
        memberUids: squad.memberUids,
        createdAt: squad.createdAt,
    });

    return squad;
}

/**
 * Join a squad by code.
 *
 * Deliberately does not read first. A non-member has no read access, so a read
 * would fail before the join could happen. The update is attempted blind and
 * the rules decide: a wrong code, a full squad, or an attempt to touch
 * anything other than your own membership all come back as permission denied,
 * which is why the caller cannot distinguish them and the UI says so plainly.
 */
export async function joinSquad(uid: string, inputCode: string): Promise<Squad> {
    const code = normaliseCode(inputCode);
    await updateDoc(squadRef(code), { memberUids: arrayUnion(uid) });

    const squad = await loadSquad(code);
    if (!squad) throw new Error('Joined but could not load the squad.');
    return squad;
}

/** Read one squad. Fails unless the caller is already a member. */
export async function loadSquad(code: string): Promise<Squad | null> {
    const snap = await getDoc(squadRef(code));
    if (!snap.exists()) return null;

    const data = snap.data();
    return {
        code: snap.id,
        name: (data.name as string) ?? 'Squad',
        targetAmount: (data.targetAmount as number) ?? 0,
        deadline: (data.deadline as string) ?? '',
        ownerUid: (data.ownerUid as string) ?? '',
        memberUids: (data.memberUids as string[]) ?? [],
        createdAt: (data.createdAt as string) ?? '',
    };
}

/**
 * Every squad this user belongs to.
 *
 * The array-contains filter is not just a convenience: a query only succeeds
 * if every document it could return satisfies the read rule, so filtering on
 * membership here is what makes the query legal at all.
 */
export async function loadMySquads(uid: string): Promise<Squad[]> {
    const snap = await getDocs(
        query(collection(db, 'squads'), where('memberUids', 'array-contains', uid))
    );
    return snap.docs.map((d) => {
        const data = d.data();
        return {
            code: d.id,
            name: (data.name as string) ?? 'Squad',
            targetAmount: (data.targetAmount as number) ?? 0,
            deadline: (data.deadline as string) ?? '',
            ownerUid: (data.ownerUid as string) ?? '',
            memberUids: (data.memberUids as string[]) ?? [],
            createdAt: (data.createdAt as string) ?? '',
        };
    });
}

/** Every member's contribution to one squad. */
export async function loadContributions(code: string): Promise<Contribution[]> {
    const snap = await getDocs(contributionsCollection(code));
    return snap.docs.map((d) => ({
        uid: d.id,
        alias: (d.data().alias as string) ?? 'Anonymous',
        amount: (d.data().amount as number) ?? 0,
        updatedAt: (d.data().updatedAt as string) ?? '',
    }));
}

/**
 * Record what this member has put in. Replaces rather than adds, so the row is
 * always the running total and a retry cannot double-count.
 *
 * The alias is derived from the uid rather than taken from a profile field, so
 * there is no path by which a display name reaches a document other members
 * can read.
 */
export async function setContribution(
    code: string,
    uid: string,
    amount: number
): Promise<void> {
    await setDoc(doc(contributionsCollection(code), uid), {
        alias: aliasForUid(uid),
        amount: sanitiseContribution(amount),
        updatedAt: new Date().toISOString(),
    });
}

/**
 * Leave a squad: drop the contribution row, then the membership.
 *
 * That order matters. Removing membership first would revoke the access needed
 * to delete the contribution, stranding the row where its owner can no longer
 * reach it.
 */
export async function leaveSquad(code: string, uid: string): Promise<void> {
    await deleteDoc(doc(contributionsCollection(code), uid));
    await updateDoc(squadRef(code), { memberUids: arrayRemove(uid) });
}

/**
 * Delete a squad. Owner only, enforced by the rules.
 *
 * Contribution rows are deleted first, for the same reason as leaving: once
 * the parent is gone the rules can no longer confirm anyone's membership, so
 * the subcollection would be orphaned and unreachable. Firestore does not
 * cascade deletes from a client.
 */
export async function deleteSquad(code: string): Promise<void> {
    const snap = await getDocs(contributionsCollection(code));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(squadRef(code));
}
