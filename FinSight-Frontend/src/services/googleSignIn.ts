/**
 * Google sign-in on Android and iOS.
 *
 * The Firebase JS SDK cannot open Google's account picker inside a native
 * app (signInWithPopup needs a browser window), so the native Google SDK picks
 * the account and hands back an ID token, and Firebase signs in with that.
 *
 * The native module is loaded on first use rather than at import. A binary
 * without it, Expo Go or a build from before this file existed, would
 * otherwise throw while the store was being created and never open at all.
 * Here it fails one button, with a sentence, instead of the whole app.
 *
 * The web build resolves googleSignIn.web.ts instead.
 */
import { GoogleAuthProvider, signInWithCredential, UserCredential } from 'firebase/auth';
import { auth } from '../config/firebase';

/** The OAuth client of type "Web application" in the Firebase project. */
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
/** The iOS OAuth client. Android needs none: it matches on package and SHA-1. */
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

const NOT_CONFIGURED = 'Google sign-in is not set up in this build yet. Use your phone number or email for now.';

let configured = false;

async function loadGoogle() {
    try {
        return await import('@react-native-google-signin/google-signin');
    } catch {
        throw new Error('Google sign-in needs the latest version of the app.');
    }
}

/**
 * Open the account picker and sign in to Firebase with the chosen account.
 * Resolves null when the person backs out, which is not an error.
 */
export async function signInWithGoogleProvider(): Promise<UserCredential | null> {
    if (!WEB_CLIENT_ID) throw new Error(NOT_CONFIGURED);
    const { GoogleSignin, isErrorWithCode, statusCodes } = await loadGoogle();

    if (!configured) {
        GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, iosClientId: IOS_CLIENT_ID });
        configured = true;
    }

    let idToken: string | null = null;
    try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const response = await GoogleSignin.signIn();
        if (response.type !== 'success') return null;
        idToken = response.data.idToken;
    } catch (error: unknown) {
        if (isErrorWithCode(error)) {
            if (error.code === statusCodes.IN_PROGRESS) return null;
            if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                throw new Error('Google Play services is missing or out of date on this phone.');
            }
            // Android reports a SHA-1 or client ID mismatch as DEVELOPER_ERROR,
            // status 10. It is a build problem, never the user's.
            if (error.code === 'DEVELOPER_ERROR' || error.code === '10') {
                throw new Error(NOT_CONFIGURED);
            }
        }
        throw error;
    }

    if (!idToken) throw new Error('Google did not return a sign-in token. Try again.');
    return signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
}

/**
 * Forget the Google account on this phone, so the next sign-in shows the
 * picker instead of silently reusing whoever signed in last.
 */
export async function signOutOfGoogle(): Promise<void> {
    // Not gated on `configured`: after a restart the SDK still remembers the
    // account even though nothing has configured it this session.
    if (!WEB_CLIENT_ID) return;
    try {
        const { GoogleSignin } = await loadGoogle();
        if (!configured) {
            GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, iosClientId: IOS_CLIENT_ID });
            configured = true;
        }
        await GoogleSignin.signOut();
    } catch {
        // Nothing to undo if Google was never used here.
    }
}
