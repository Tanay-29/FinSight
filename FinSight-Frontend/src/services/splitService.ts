/**
 * Split Service
 *
 * The whole ledger is one document under the owner's own user path. It is
 * small (a handful of names and expenses) and always read and written as a
 * unit, so a single document is the right shape and keeps the security rules
 * to one line.
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SplitExpense, SplitParticipant, ME } from '../utils/split';

export interface SplitLedger {
    participants: SplitParticipant[];
    expenses: SplitExpense[];
}

function ledgerRef(userId: string) {
    return doc(db, 'users', userId, 'split', 'ledger');
}

export async function loadSplitLedger(userId: string): Promise<SplitLedger | null> {
    const snap = await getDoc(ledgerRef(userId));
    if (!snap.exists()) return null;

    const data = snap.data();
    const participants = (data.participants as SplitParticipant[]) ?? [];

    return {
        // "You" is always present, even if an older document predates it.
        participants: participants.some((p) => p.id === ME)
            ? participants
            : [{ id: ME, name: 'You' }, ...participants],
        expenses: (data.expenses as SplitExpense[]) ?? [],
    };
}

export async function saveSplitLedger(userId: string, ledger: SplitLedger): Promise<void> {
    await setDoc(ledgerRef(userId), {
        participants: ledger.participants,
        expenses: ledger.expenses,
        updatedAt: new Date().toISOString(),
    });
}
