/**
 * Authentication Service
 *
 * Wraps Firebase Auth methods for sign-up, login, logout,
 * and auth state listening.
 */
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged,
    User,
    updateProfile,
    deleteUser,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { createUserProfile, deleteAllUserData } from './firestoreService';

/** Thrown when Firebase needs a fresh sign-in before it will delete the account. */
export class ReauthRequiredError extends Error {
    constructor() {
        super('For security, please sign out and sign in again, then retry deleting your account.');
        this.name = 'ReauthRequiredError';
    }
}

/** Sign up with email and password */
export async function signUp(
    email: string,
    password: string,
    displayName: string
): Promise<User> {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    // Set display name
    await updateProfile(credential.user, { displayName });
    // Create user profile doc in Firestore
    await createUserProfile(credential.user.uid, {
        name: displayName,
        email,
        riskProfile: 'moderate',          // temporary default - overwritten by onboarding Step 5
        primaryGoal: 'savings',
        preferences: {
            notifications: true,
            language: 'en-IN',
        },
        createdAt: new Date().toISOString(),
        onboardingComplete: false,         // ensures new users always go through onboarding first
    });
    return credential.user;
}

/** Sign in with email and password */
export async function signIn(
    email: string,
    password: string
): Promise<User> {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
}

/**
 * Send a password reset email.
 *
 * Resolves identically whether or not an account exists for the address.
 * Firebase reports auth/user-not-found, and passing that back to the caller
 * would turn this screen into a way of testing which emails are registered.
 */
export async function sendPasswordReset(email: string): Promise<void> {
    try {
        await sendPasswordResetEmail(auth, email.trim());
    } catch (error: unknown) {
        const code = (error as { code?: string })?.code;
        if (code === 'auth/user-not-found' || code === 'auth/invalid-email') return;
        throw error;
    }
}

/** Sign out */
export async function logOut(): Promise<void> {
    await signOut(auth);
}

/** Subscribe to auth state changes */
export function onAuthChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
}

/**
 * Permanently delete the signed-in user: Firestore documents first, then the
 * Auth record. Firestore is cleared first because the security rules require an
 * authenticated owner, so the writes must happen while the account still exists.
 *
 * Firebase refuses to delete an account whose sign-in is not recent. That
 * surfaces as ReauthRequiredError so the caller can ask the user to sign in
 * again rather than showing a raw Firebase error code.
 */
export async function deleteAccount(): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('No signed-in user.');

    await deleteAllUserData(user.uid);

    try {
        await deleteUser(user);
    } catch (error: any) {
        if (error?.code === 'auth/requires-recent-login') {
            throw new ReauthRequiredError();
        }
        throw error;
    }
}
