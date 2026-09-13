
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
     * Improvement League. Opt-in defaults to off: nothing about a learner is
     * published to a cross-user collection until they turn this on.
     */
    leagueOptIn?: boolean;
    /** Week the baseline below belongs to, as 'YYYY-Www'. */
    leagueBaselineWeek?: string;
    /** IQ score when the week began, so gain can be measured against it. */
    leagueBaselineScore?: number;
    /**
     * FinSight Plus entitlement.
     *
     * Carried on the profile rather than in a receipt because no payment is
     * taken: this is a demonstration of the gating, not a live subscription.
     * A real build would read this from the store instead.
     */
    premium?: {
        active: boolean;
        plan: 'monthly' | 'annual' | null;
        renewsAt: string | null;
        simulated: boolean;
    };
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
    /**
     * What the parser guessed at save time, for a transaction that went
     * through Smart Paste. Set once and never touched again, including by a
     * later Tidy Up correction, which updates `category` only.
     *
     * Without this, correcting a transaction overwrote the very prediction it
     * would need to be scored against, and the accuracy study the paper's
     * section 7.4 calls for had no ground truth to compare against. With it,
     * `predictedCategory !== category` on any transaction is a wrong guess,
     * countable directly from the transactions collection with no separate
     * event log to keep in sync.
     */
    predictedCategory?: string;
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

/**
 * Every transaction on or after `sinceISO`, newest first.
 *
 * This replaced `getRecentTransactions`, which took `count = 20` and was
 * called with no argument from the one place that used it. That meant
 * `state.transactions.items` was never more than the twenty most recent rows,
 * of either direction, from any month, while twelve consumers read that array
 * believing they had a window: `computeBurnRate` and `computeRule503020` want
 * the calendar month, `summariseNoSpendDays` walks every day of it, the Feed
 * compares two thirty-day windows, and SubscriptionTracker's own header says
 * it looks back ninety days.
 *
 * At three to five logged transactions a day, twenty rows is four to six days.
 * On the 20th of a month that understated burn rate roughly threefold and
 * reported ON_TRACK, and told someone who had spent money every day that they
 * had thirteen clear ones. The formulas were right; the input was silently
 * truncated.
 *
 * `date` is stored as an ISO 8601 string, which sorts lexicographically in
 * chronological order, so a string range works and needs no schema change. The
 * range and the sort are on the same field, so this stays a single-field index
 * and no composite index has to be deployed.
 *
 * `cap` is a ceiling against a runaway read, not a window. It is deliberately
 * far above what ninety days of honest logging produces.
 */
export async function getTransactionsSince(
    userId: string,
    sinceISO: string,
    cap: number = 500
): Promise<FirestoreTransaction[]> {
    const q = query(
        collection(db, 'users', userId, 'transactions'),
        where('date', '>=', sinceISO),
        orderBy('date', 'desc'),
        limit(cap)
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

/**
 * The document id for one category's budget in one month.
 *
 * A user can only have one budget per category per month, so that fact is
 * encoded in the key rather than left to the caller to enforce. This function
 * was called setBudget and documented as "set or update", but it used addDoc,
 * which always writes a new document: setting an Entertainment budget twice
 * left two Entertainment budgets in the same month, and the screen rendered
 * both under the same React key.
 */
const budgetDocId = (month: string, category: string) =>
    `${month}_${category.trim().toLowerCase()}`;

/** Create or replace the budget for one category in one month. */
export async function setBudget(
    userId: string,
    budget: Omit<FirestoreBudget, 'id'>
): Promise<string> {
    const id = budgetDocId(budget.month, budget.category);
    await setDoc(
        doc(db, 'users', userId, 'budgets', id),
        { ...budget, category: budget.category.trim().toLowerCase() },
        { merge: true }
    );
    return id;
}

/**
 * Budgets for a given month, at most one per category.
 *
 * Accounts created before the id above will still hold duplicates written by
 * the old addDoc path, so the read collapses them: for each category the
 * highest limit wins, and its spend is the highest recorded against any of
 * them. Deleting the losers is left alone deliberately, because a read should
 * not destroy data.
 */
export async function getBudgets(
    userId: string,
    month: string
): Promise<FirestoreBudget[]> {
    const q = query(
        collection(db, 'users', userId, 'budgets'),
        where('month', '==', month)
    );
    const snap = await getDocs(q);
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreBudget));

    const byCategory = new Map<string, FirestoreBudget>();
    for (const b of all) {
        const key = (b.category ?? '').trim().toLowerCase();
        const existing = byCategory.get(key);
        if (!existing) {
            byCategory.set(key, b);
            continue;
        }
        byCategory.set(key, {
            ...existing,
            // Prefer the canonical id when one of the duplicates has it.
            id: existing.id === budgetDocId(month, key) ? existing.id : b.id,
            monthlyLimit: Math.max(existing.monthlyLimit, b.monthlyLimit),
            currentSpend: Math.max(existing.currentSpend ?? 0, b.currentSpend ?? 0),
        });
    }
    return [...byCategory.values()];
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
    merchant: string,
    predictedCategory?: string,
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
            {
                merchant: key,
                category,
                // Present only when this transaction was ever auto-parsed, so
                // the accuracy study can tell "the parser guessed X, this is
                // Y" apart from "there was never a guess to score".
                ...(predictedCategory ? { predictedCategory } : {}),
                correctedAt: new Date().toISOString(),
            }
        );
    } catch {
        // Logging is a nice-to-have; the category change already succeeded.
    }
}

/**
 * Log that the parser's guess and what the user actually chose disagreed, for
 * a transaction that was never wrong on Firestore in the first place.
 *
 * Distinct from `correctTransactionCategory`, which is Tidy Up fixing a
 * transaction that is SITTING there with the wrong category. This covers the
 * other case: someone pastes a bank SMS, the parser guesses "shopping", they
 * notice and pick "dining" in the form before Save ever runs. The transaction
 * is created with the right category from the start, so there is nothing on
 * it to update, but the disagreement is exactly the kind of labelled example
 * the accuracy study needs and it was previously invisible: only fixes made
 * after the fact, in Tidy Up, were ever recorded, which biased the corpus
 * toward errors people noticed later rather than errors people noticed at
 * all.
 */
export async function recordCategoryDisagreement(
    userId: string,
    transactionId: string,
    merchant: string,
    predictedCategory: string,
    actualCategory: string,
): Promise<void> {
    if (predictedCategory === actualCategory) return;
    const key = merchant.trim().toLowerCase();
    if (!key) return;

    try {
        await setDoc(
            doc(db, 'users', userId, 'category_corrections', transactionId),
            {
                merchant: key,
                category: actualCategory,
                predictedCategory,
                correctedAt: new Date().toISOString(),
            }
        );
    } catch {
        // Same as correctTransactionCategory: logging is a nice-to-have and
        // must never block the save that already succeeded.
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

    return recordStudyDay(userId);
}

/**
 * Count today as a study day on the profile, spending a freeze if one is
 * needed and available. Called by markModuleComplete, and on its own when a
 * daily lesson session finishes without closing out a whole lesson, so the
 * streak counts sessions rather than only module completions.
 */
export async function recordStudyDay(userId: string): Promise<StreakUpdate | null> {
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