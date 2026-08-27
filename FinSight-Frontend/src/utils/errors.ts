/**
 * Turning SDK errors into sentences a person can act on.
 *
 * Every thunk in the app used to reject with `error.message`, which for
 * Firebase is a string written for a developer: "Firebase: Error
 * (auth/invalid-credential)." That reached the user unchanged, on the login
 * screen among other places.
 *
 * Two rules shape the wording below. Say what happened and what to do about
 * it, and never reveal whether an account exists for a given email, which is
 * why a wrong password and an unknown address give the same sentence.
 */

/** Firebase Auth, then Firestore. Both surface a `code` on the error object. */
const MESSAGES: Record<string, string> = {
    // ── Auth ─────────────────────────────────────────────────────────────
    // Recent Firebase collapses wrong-password and unknown-email into
    // invalid-credential precisely so the two cannot be told apart. The older
    // codes are mapped to the same sentence so nothing regresses if the SDK
    // reports them.
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/user-not-found': 'Email or password is incorrect.',
    'auth/invalid-email': 'That does not look like an email address.',
    'auth/missing-password': 'Enter your password.',
    'auth/missing-email': 'Enter your email address.',
    'auth/email-already-in-use': 'An account already exists for that email. Try signing in instead.',
    'auth/weak-password': 'Pick a password with at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
    'auth/network-request-failed': 'You appear to be offline. Check your connection and try again.',
    'auth/user-disabled': 'That account has been disabled.',
    'auth/requires-recent-login': 'For security, sign out and sign in again before doing that.',
    'auth/operation-not-allowed': 'Email sign-in is not enabled for this app.',
    'auth/internal-error': 'Something went wrong at our end. Try again in a moment.',

    // ── Firestore ────────────────────────────────────────────────────────
    'permission-denied': 'You do not have access to that.',
    unauthenticated: 'Your session has expired. Sign in again.',
    unavailable: 'Cannot reach the server. Check your connection and try again.',
    'deadline-exceeded': 'That took too long. Try again.',
    'not-found': 'That is not there any more.',
    'already-exists': 'That already exists.',
    'resource-exhausted': 'The app has hit a usage limit. Try again later.',
    cancelled: 'That was cancelled before it finished.',
    aborted: 'Something else changed at the same time. Try again.',
    'failed-precondition': 'That cannot be done right now.',
};

function codeOf(error: unknown): string | null {
    if (typeof error !== 'object' || error === null) return null;
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
}

function messageOf(error: unknown): string | null {
    if (typeof error !== 'object' || error === null) return null;
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : null;
}

/**
 * A sentence worth showing someone.
 *
 * `fallback` is what they see when the error carries a code we have not mapped
 * or no code at all, so write it for the specific thing that was being
 * attempted rather than as a generic apology.
 */
export function friendlyError(error: unknown, fallback: string): string {
    const code = codeOf(error);
    if (code && MESSAGES[code]) return MESSAGES[code];

    // Errors the app raises itself are already written for a person and carry
    // no code. Anything from an SDK either has a code we did not map or a
    // message aimed at a developer, and the caller's fallback beats both.
    if (!code) {
        const message = messageOf(error);
        if (
            message &&
            message.length < 140 &&
            !message.includes('Firebase') &&
            !message.includes('\n')
        ) {
            return message;
        }
    }

    return fallback;
}
