/**
 * Authentication Service
 *
 * Three ways in, one account model. Email and password, Google, and a phone
 * number with a one-time code all end in a Firebase user and the same
 * users/{uid} profile document, so nothing past this file needs to know which
 * one was used.
 */
import {
    ApplicationVerifier,
    ConfirmationResult,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPhoneNumber,
    sendEmailVerification,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged,
    User,
    updateProfile,
    deleteUser,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import {
    createUserProfile,
    deleteAllUserData,
    getUserProfile,
    mergeUserProfile,
    UserProfile,
} from './firestoreService';
import { signInWithGoogleProvider, signOutOfGoogle } from './googleSignIn';

type AuthProvider = NonNullable<UserProfile['authProvider']>;

/** Which of the three ways in this Firebase user used. */
export function providerOf(user: User): AuthProvider {
    const ids = user.providerData.map((p) => p.providerId);
    if (ids.includes('google.com')) return 'google';
    if (ids.includes('phone')) return 'phone';
    return 'password';
}

/**
 * The document every new account starts with, whichever way it came in.
 *
 * Firestore rejects undefined field values, so the phone number is only
 * present when there is one.
 */
export function newProfile(user: Pick<User, 'displayName' | 'email' | 'phoneNumber'>, provider: AuthProvider): UserProfile {
    return {
        name: user.displayName ?? '',
        email: user.email ?? '',
        ...(user.phoneNumber ? { phoneNumber: user.phoneNumber } : {}),
        authProvider: provider,
        riskProfile: 'moderate',          // temporary default
        primaryGoal: 'savings',
        preferences: {
            notifications: true,
            language: 'en-IN',
        },
        createdAt: new Date().toISOString(),
        onboardingComplete: false,         // ensures new users always go through onboarding first
    };
}

/**
 * Give a Google or phone account its profile document the first time it
 * signs in. Best effort: onboarding writes the same base fields with a merge,
 * so a write lost here to a weak signal is recovered there.
 */
async function ensureUserProfile(user: User): Promise<void> {
    try {
        if (await getUserProfile(user.uid)) return;
        await createUserProfile(user.uid, newProfile(user, providerOf(user)));
    } catch {
        // See above: onboarding repairs it.
    }
}

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
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const name = displayName.trim();
    if (name) await updateProfile(credential.user, { displayName: name });
    await createUserProfile(
        credential.user.uid,
        newProfile({ displayName: name || null, email: credential.user.email, phoneNumber: null }, 'password'),
    );
    // Not a gate: the account works straight away. It is what lets a password
    // reset reach them later, and what Firebase checks before linking a
    // Google sign-in on the same address to this account.
    sendEmailVerification(credential.user).catch(() => { });
    return credential.user;
}

/** Sign in with email and password */
export async function signIn(
    email: string,
    password: string
): Promise<User> {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return credential.user;
}

/** Google. Resolves null when the person backs out of the account picker. */
export async function signInWithGoogle(): Promise<User | null> {
    const credential = await signInWithGoogleProvider();
    if (!credential) return null;
    await ensureUserProfile(credential.user);
    return credential.user;
}

/**
 * Send a one-time code to a phone number in E.164 form (+919876543210).
 *
 * The verifier is the reCAPTCHA check Firebase requires before it will send
 * an SMS from a JS client; see components/auth/RecaptchaGate.
 */
export function sendPhoneCode(phoneE164: string, verifier: ApplicationVerifier): Promise<ConfirmationResult> {
    return signInWithPhoneNumber(auth, phoneE164, verifier);
}

/** Finish a phone sign-in with the six digits from the SMS. */
export async function confirmPhoneCode(confirmation: ConfirmationResult, code: string): Promise<User> {
    const credential = await confirmation.confirm(code);
    await ensureUserProfile(credential.user);
    return credential.user;
}

/**
 * Save the onboarding answers and mark onboarding done.
 *
 * Merges rather than updates, and fills in the base fields when there is no
 * profile yet, so it cannot fail on a missing document. The name the person
 * typed also becomes their Firebase display name, which is what the greeting
 * and the profile read.
 */
export async function saveOnboarding(
    uid: string,
    answers: Partial<UserProfile>,
    hasProfile: boolean,
): Promise<Partial<UserProfile>> {
    const user = auth.currentUser;
    const patch: Partial<UserProfile> = { ...answers, onboardingComplete: true };
    const full = !hasProfile && user ? { ...newProfile(user, providerOf(user)), ...patch } : patch;
    await mergeUserProfile(uid, full);
    if (user && answers.name && answers.name !== user.displayName) {
        await updateProfile(user, { displayName: answers.name }).catch(() => { });
    }
    return full;
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
    await signOutOfGoogle();
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
    await signOutOfGoogle();
}
