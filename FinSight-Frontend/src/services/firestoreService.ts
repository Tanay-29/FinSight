
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
    QuerySnapshot,
    DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { applyStudyDay, StreakUpdate } from '../utils/streak';

// ─── Types ───────────────────────────────────────────────────

export interface UserProfile {
    name: string;
    email: string;
    riskProfile: 'conservative' | 'moderate' | 'aggressive';
    primaryGoal: string;
    preferences: {
        notifications: boolean;
        language: string;
        /** Auto-categorise transactions pasted from bank SMS. */
        autoTracking?: boolean;
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
    /** Banked streak freezes. Each absorbs one missed day. */
    streakFreezes?: number;
    /** Daily question: last day answered, and lifetime tallies. */
    lastDailyDate?: string;
    dailyAnswered?: number;
    dailyCorrect?: number;
    /**
     * Spend guesses keyed by month ('2026-08'). Bounded by the number of
     * months the user has been active, so it is safe to keep on the profile.
     */
    spendGuesses?: Record<string, { guess: number; actual: number; accuracy: number; guessedAt: string }>;
    /**
     * Improvement League. Opt-in defaults to off: nothing about a learner is
     * published to a cross-user collection until they turn this on.
     */
    leagueOptIn?: boolean;
    /** Week the baseline below belongs to, as 'YYYY-Www'. */
    leagueBaselineWeek?: string;
    /** IQ score when the week began, so gain can be measured against it. */
    leagueBaselineScore?: number;
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

/**
 * Change a transaction's category, and record the correction.
 *
 * The correction log is the point: it is a merchant-to-category mapping the
 * user confirmed by hand, which is the labelled data the keyword categoriser
 * needs before its accuracy can be measured or improved. Writing it is
 * best-effort, so a failure there never blocks the category change itself.
 */
export async function correctTransactionCategory(
    userId: string,
    transactionId: string,
    category: string,
    merchant: string
): Promise<void> {
    await updateDoc(
        doc(db, 'users', userId, 'transactions', transactionId),
        { category }
    );

    const key = merchant.trim().toLowerCase();
    if (!key) return;

    try {
        await setDoc(
            doc(db, 'users', userId, 'category_corrections', transactionId),
            { merchant: key, category, correctedAt: new Date().toISOString() }
        );
    } catch {
        // Logging is a nice-to-have; the category change already succeeded.
    }
}

/** Every per-user subcollection. Keep in sync with firestore.rules. */
const USER_SUBCOLLECTIONS = [
    'transactions', 'budgets', 'goals', 'learning_progress', 'flashcard_reviews',
    'category_corrections', 'split',
] as const;

/** Delete the contents of every per-user subcollection, keeping the profile. */
/**
 * Every category the user has put a merchant into by hand.
 *
 * One document is written per correction event, so a merchant corrected twice
 * appears twice. The most recent wins, which is what "I changed my mind" should
 * mean. Returns a plain merchant to category map, ready to hand to
 * matchMerchant as its learned table.
 *
 * This subcollection has been filling up since categorisation shipped and
 * nothing read it until now.
 */
export async function getCategoryCorrections(
    userId: string
): Promise<Record<string, string>> {
    const snapshot = await getDocs(
        collection(db, 'users', userId, 'category_corrections')
    );

    const latestAt: Record<string, string> = {};
    const learned: Record<string, string> = {};

    snapshot.forEach((entry) => {
        const data = entry.data() as {
            merchant?: string;
            category?: string;
            correctedAt?: string;
        };
        const merchant = (data.merchant ?? '').trim().toLowerCase();
        if (!merchant || !data.category) return;

        const at = data.correctedAt ?? '';
        if (latestAt[merchant] !== undefined && at <= latestAt[merchant]) return;

        latestAt[merchant] = at;
        learned[merchant] = data.category;
    });

    return learned;
}

export async function clearUserData(userId: string): Promise<void> {
    await Promise.all(
        USER_SUBCOLLECTIONS.map(async (name) => {
            const snap = await getDocs(collection(db, 'users', userId, name));
            await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
        })
    );
}

/** Delete all user data including the profile document itself. */
export async function deleteAllUserData(userId: string): Promise<void> {
    await clearUserData(userId);
    await deleteDoc(doc(db, 'users', userId));
}

/**
 * Collect everything the app stores about a user into one plain object,
 * suitable for writing out as JSON.
 */
export async function collectUserDataForExport(userId: string): Promise<Record<string, unknown>> {
    const [profile, transactions, budgets, goals, progress, reviews] = await Promise.all([
        getUserProfile(userId),
        getDocs(collection(db, 'users', userId, 'transactions')),
        getDocs(collection(db, 'users', userId, 'budgets')),
        getDocs(collection(db, 'users', userId, 'goals')),
        getDocs(collection(db, 'users', userId, 'learning_progress')),
        getDocs(collection(db, 'users', userId, 'flashcard_reviews')),
    ]);

    const toArray = (snap: QuerySnapshot<DocumentData>) =>
        snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return {
        exportedAt: new Date().toISOString(),
        app: 'FinSight',
        formatVersion: 1,
        profile,
        transactions: toArray(transactions),
        budgets: toArray(budgets),
        goals: toArray(goals),
        learningProgress: toArray(progress),
        flashcardReviews: toArray(reviews),
    };
}


// ═══════════════════════════════════════════════════════════════════
// APPEND THIS BLOCK to: app/src/services/firestoreService.ts
// (add after the "Learning Paths" section at the bottom of the file)
// ═══════════════════════════════════════════════════════════════════

// ─── Savings Goals ───────────────────────────────────────────

export interface FirestoreGoal {
    id?: string;
    title: string;
    /** Icon key from theme/icons.ts GOAL_ICONS, e.g. 'home'. */
    icon: string;
    targetAmount: number;
    savedAmount: number;
    deadline: string;    // ISO date string e.g. '2026-12-31'
    color: string;       // hex accent colour
    createdAt: string;
    /** @deprecated Emoji glyph written by older builds. Read-only. */
    emoji?: string;
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
): Promise<StreakUpdate | null> {
    const progressRef = doc(db, 'users', userId, 'learning_progress', pathId);
    const snap = await getDoc(progressRef);

    // Build updated completedModules array
    let existing: string[] = [];
    if (snap.exists()) {
        existing = (snap.data().completedModules as string[]) || [];
    }
    if (existing.includes(moduleId)) return null; // already done - idempotent

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

    // Update the streak, spending a freeze if one is needed and available.
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return null;

    const data = userSnap.data();
    const update = applyStudyDay({
        streak: data.streak || 0,
        lastStudiedDate: data.lastStudiedDate || '',
        freezes: data.streakFreezes || 0,
    });

    await updateDoc(userRef, {
        streak: update.streak,
        lastStudiedDate: update.lastStudiedDate,
        streakFreezes: update.freezes,
    });

    return update;
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