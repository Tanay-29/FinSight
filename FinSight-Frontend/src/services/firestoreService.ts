
/**
 * Firestore Service
 *
 * CRUD operations for Users, Transactions, and Budgets collections.
 * Follows the PRD schema: users/{userId}/transactions, users/{userId}/budgets.
 */
import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    Unsubscribe,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ─── Types ───────────────────────────────────────────────────

export interface UserProfile {
    name: string;
    email: string;
    riskProfile: 'conservative' | 'moderate' | 'aggressive';
    primaryGoal: string;
    preferences: {
        notifications: boolean;
        language: string;
    };
    createdAt: string;
    // Onboarding profile fields
    age?: number;
    experienceLevel?: 'beginner' | 'intermediate' | 'experienced';
    appGoals?: Array<'budgeting' | 'goals' | 'investing' | 'education'>;
    incomeRange?: string;
    onboardingComplete?: boolean;
    // Learning streak
    streak?: number;
    lastStudiedDate?: string; // ISO date string e.g. '2026-04-20'
}

export interface FirestoreTransaction {
    id?: string;
    amount: number;
    type: 'debit' | 'credit';
    category: string;
    merchant: string;
    date: string;
    source: 'auto' | 'manual';
    notes?: string;
}

export interface FirestoreBudget {
    id?: string;
    category: string;
    monthlyLimit: number;
    currentSpend: number;
    month: string; // '2026-02'
}

// ─── User Profile ────────────────────────────────────────────

/** Create a new user profile document */
export async function createUserProfile(
    userId: string,
    profile: UserProfile
): Promise<void> {
    await setDoc(doc(db, 'users', userId), profile);
}

/** Get user profile */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, 'users', userId));
    return snap.exists() ? (snap.data() as UserProfile) : null;
}

/** Update user profile fields */
export async function updateUserProfile(
    userId: string,
    data: Partial<UserProfile>
): Promise<void> {
    await updateDoc(doc(db, 'users', userId), data);
}

// ─── Transactions ────────────────────────────────────────────

/** Add a new transaction */
export async function addTransactionToFirestore(
    userId: string,
    transaction: Omit<FirestoreTransaction, 'id'>
): Promise<string> {
    const ref = await addDoc(
        collection(db, 'users', userId, 'transactions'),
        transaction
    );
    return ref.id;
}

/** Get recent transactions (last N) */
export async function getRecentTransactions(
    userId: string,
    count: number = 20
): Promise<FirestoreTransaction[]> {
    const q = query(
        collection(db, 'users', userId, 'transactions'),
        orderBy('date', 'desc'),
        limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreTransaction));
}

/** Subscribe to transactions in real-time */
export function subscribeToTransactions(
    userId: string,
    callback: (transactions: FirestoreTransaction[]) => void,
    count: number = 50
): Unsubscribe {
    const q = query(
        collection(db, 'users', userId, 'transactions'),
        orderBy('date', 'desc'),
        limit(count)
    );
    return onSnapshot(q, (snap) => {
        const items = snap.docs.map(
            (d) => ({ id: d.id, ...d.data() } as FirestoreTransaction)
        );
        callback(items);
    });
}

/** Delete a transaction */
export async function deleteTransaction(
    userId: string,
    transactionId: string
): Promise<void> {
    await deleteDoc(doc(db, 'users', userId, 'transactions', transactionId));
}

// ─── Budgets ─────────────────────────────────────────────────

/** Set or update a budget for a category */
export async function setBudget(
    userId: string,
    budget: Omit<FirestoreBudget, 'id'>
): Promise<string> {
    const ref = await addDoc(
        collection(db, 'users', userId, 'budgets'),
        budget
    );
    return ref.id;
}

/** Get budgets for a given month */
export async function getBudgets(
    userId: string,
    month: string
): Promise<FirestoreBudget[]> {
    const q = query(
        collection(db, 'users', userId, 'budgets'),
        where('month', '==', month)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreBudget));
}

/** Subscribe to budgets in real-time */
export function subscribeToBudgets(
    userId: string,
    month: string,
    callback: (budgets: FirestoreBudget[]) => void
): Unsubscribe {
    const q = query(
        collection(db, 'users', userId, 'budgets'),
        where('month', '==', month)
    );
    return onSnapshot(q, (snap) => {
        const items = snap.docs.map(
            (d) => ({ id: d.id, ...d.data() } as FirestoreBudget)
        );
        callback(items);
    });
}

/** Update budget spending */
export async function updateBudgetSpend(
    userId: string,
    budgetId: string,
    currentSpend: number
): Promise<void> {
    await updateDoc(
        doc(db, 'users', userId, 'budgets', budgetId),
        { currentSpend }
    );
}

/** Update budget limit */
export async function updateBudgetLimit(
    userId: string,
    budgetId: string,
    monthlyLimit: number
): Promise<void> {
    await updateDoc(
        doc(db, 'users', userId, 'budgets', budgetId),
        { monthlyLimit }
    );
}

// ─── Glossary ────────────────────────────────────────────────

export interface FirestoreGlossaryTerm {
    id?: string;
    term: string;
    definition: string;
}

/** Get all glossary terms */
export async function getGlossaryTerms(): Promise<FirestoreGlossaryTerm[]> {
    const q = query(collection(db, 'glossary'), orderBy('term'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreGlossaryTerm));
}

/** Seed glossary with initial data */
export async function seedGlossary(terms: FirestoreGlossaryTerm[]): Promise<void> {
    const batch = [];
    // Firestore batch writes are limited to 500. We'll just use Promise.all for simplicity here 
    // since this is a one-time seed of ~15 items.
    const promises = terms.map((term) => addDoc(collection(db, 'glossary'), term));
    await Promise.all(promises);
}

// ─── Learning Paths ──────────────────────────────────────────

export interface FirestoreLearningPath {
    id?: string;
    title: string;
    description: string;
    overview: string;
    progress: { completed: number; total: number };
    nextModule: string;
    badgeEarned: boolean;
    modules: any[]; // Array of Module objects
}

/** Get all learning paths */
export async function getLearningPaths(): Promise<FirestoreLearningPath[]> {
    const snap = await getDocs(collection(db, 'learning_paths'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreLearningPath));
}

/**
 * Seed learning paths using setDoc with stable IDs (path.id as doc ID).
 * Idempotent — re-running won't create duplicates.
 */
export async function seedLearningPaths(paths: FirestoreLearningPath[]): Promise<void> {
    const promises = paths.map((path) => {
        const docId = (path as any).id ?? path.title.replace(/\s+/g, '_').toLowerCase();
        return setDoc(doc(db, 'learning_paths', docId), path, { merge: false });
    });
    await Promise.all(promises);
}
/** Clear all user data */
export async function clearUserData(userId: string): Promise<void> {
    const transactionsQ = query(collection(db, 'users', userId, 'transactions'));
    const transactionsSnap = await getDocs(transactionsQ);
    const transPromises = transactionsSnap.docs.map(d => deleteDoc(d.ref));

    const budgetsQ = query(collection(db, 'users', userId, 'budgets'));
    const budgetsSnap = await getDocs(budgetsQ);
    const budgetPromises = budgetsSnap.docs.map(d => deleteDoc(d.ref));

    await Promise.all([...transPromises, ...budgetPromises]);
}


// ═══════════════════════════════════════════════════════════════════
// APPEND THIS BLOCK to: app/src/services/firestoreService.ts
// (add after the "Learning Paths" section at the bottom of the file)
// ═══════════════════════════════════════════════════════════════════

// ─── Savings Goals ───────────────────────────────────────────

export interface FirestoreGoal {
    id?: string;
    title: string;
    emoji: string;
    targetAmount: number;
    savedAmount: number;
    deadline: string;    // ISO date string e.g. '2026-12-31'
    color: string;       // hex accent colour
    createdAt: string;
}

/** Add a new savings goal */
export async function addGoal(
    userId: string,
    goal: Omit<FirestoreGoal, 'id'>
): Promise<string> {
    const ref = await addDoc(
        collection(db, 'users', userId, 'goals'),
        goal
    );
    return ref.id;
}

/** Fetch all goals for a user */
export async function getGoals(userId: string): Promise<FirestoreGoal[]> {
    const q = query(
        collection(db, 'users', userId, 'goals'),
        orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreGoal));
}

/** Update saved amount on a goal */
export async function updateGoalSaved(
    userId: string,
    goalId: string,
    savedAmount: number
): Promise<void> {
    await updateDoc(
        doc(db, 'users', userId, 'goals', goalId),
        { savedAmount }
    );
}

/** Delete a goal */
export async function deleteGoal(
    userId: string,
    goalId: string
): Promise<void> {
    await deleteDoc(doc(db, 'users', userId, 'goals', goalId));
}

// ─── Learning Progress (per user) ────────────────────────────

export interface UserProgress {
    pathId: string;
    completedModules: string[];   // array of module IDs
    lastModuleId: string | null;
    percentage: number;           // 0-100
    badgeEarned: boolean;
    updatedAt: string;            // ISO string
}

/**
 * Fetch all progress documents for a user.
 * Returns a map of { [pathId]: UserProgress } for easy lookup.
 */
export async function getUserProgress(
    userId: string
): Promise<Record<string, UserProgress>> {
    const snap = await getDocs(
        collection(db, 'users', userId, 'learning_progress')
    );
    const result: Record<string, UserProgress> = {};
    snap.docs.forEach((d) => {
        result[d.id] = { pathId: d.id, ...d.data() } as UserProgress;
    });
    return result;
}

/**
 * Mark a module complete for a user in a given path.
 * Handles:
 * - Adding moduleId to completedModules array
 * - Calculating new percentage
 * - Setting badgeEarned if all modules done
 * - Updating daily streak on the user profile
 */
export async function markModuleComplete(
    userId: string,
    pathId: string,
    moduleId: string,
    totalModules: number
): Promise<void> {
    const progressRef = doc(db, 'users', userId, 'learning_progress', pathId);
    const snap = await getDoc(progressRef);

    // Build updated completedModules array
    let existing: string[] = [];
    if (snap.exists()) {
        existing = (snap.data().completedModules as string[]) || [];
    }
    if (existing.includes(moduleId)) return; // already done — idempotent

    const updated = [...existing, moduleId];
    const percentage = Math.round((updated.length / totalModules) * 100);
    const badgeEarned = updated.length >= totalModules;

    await setDoc(
        progressRef,
        {
            pathId,
            completedModules: updated,
            lastModuleId: moduleId,
            percentage,
            badgeEarned,
            updatedAt: new Date().toISOString(),
        },
        { merge: true }
    );

    // Update streak on user profile
    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const data = userSnap.data();
        const lastDate: string = data.lastStudiedDate || '';
        const currentStreak: number = data.streak || 0;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak = 1;
        if (lastDate === today) {
            newStreak = currentStreak; // already studied today, don't change
        } else if (lastDate === yesterdayStr) {
            newStreak = currentStreak + 1; // consecutive day
        }
        // else: streak resets to 1

        await updateDoc(userRef, {
            streak: newStreak,
            lastStudiedDate: today,
        });
    }
}

/** Get streak info from user profile */
export async function getStreakData(
    userId: string
): Promise<{ streak: number; lastStudiedDate: string }> {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
        const data = snap.data();
        return {
            streak: data.streak || 0,
            lastStudiedDate: data.lastStudiedDate || '',
        };
    }
    return { streak: 0, lastStudiedDate: '' };
}