/**
 * Authentication Service
 *
 * Wraps Firebase Auth methods for sign-up, login, logout,
 * and auth state listening.
 */
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User,
    updateProfile,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { createUserProfile } from './firestoreService';

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
        riskProfile: 'moderate',          // temporary default — overwritten by onboarding Step 5
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

/** Sign out */
export async function logOut(): Promise<void> {
    await signOut(auth);
}

/** Subscribe to auth state changes */
export function onAuthChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
}
