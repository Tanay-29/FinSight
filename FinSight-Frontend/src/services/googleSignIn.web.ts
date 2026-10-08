/**
 * Google sign-in on the web build, where Firebase can open Google's own popup.
 * Same contract as googleSignIn.ts: null when the person closes it.
 */
import { GoogleAuthProvider, signInWithPopup, UserCredential } from 'firebase/auth';
import { auth } from '../config/firebase';

export async function signInWithGoogleProvider(): Promise<UserCredential | null> {
    try {
        return await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error: unknown) {
        const code = (error as { code?: string })?.code;
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null;
        throw error;
    }
}

export async function signOutOfGoogle(): Promise<void> {
    // Firebase's own sign-out covers the web session.
}
