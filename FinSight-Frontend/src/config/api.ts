/**
 * api.ts - Backend URL config for all Flask API calls
 *
 * The API is hosted on a tier that puts the container to sleep after a spell
 * of inactivity, and waking it has been measured at over a minute. fetch has
 * no timeout of its own, so without one here the first request of the day
 * simply never settles: the thunk stays pending, and the card that is waiting
 * on it shows a loading skeleton for ever with nothing to tell the user why.
 */
import { auth } from './firebase';

/** Long enough to cover a cold start, short enough to end in a message. */
export const REQUEST_TIMEOUT_MS = 45000;

/** Thrown when the request was still unanswered when the clock ran out. */
export class TimeoutError extends Error {
    constructor() {
        super('The server is waking up. Give it a moment and pull to refresh.');
        this.name = 'TimeoutError';
    }
}

/** fetch with a deadline. Rejects with TimeoutError rather than hanging. */
export const fetchWithTimeout = async (
    url: string,
    init: RequestInit = {},
    timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } catch (error: any) {
        if (error?.name === 'AbortError') throw new TimeoutError();
        throw error;
    } finally {
        clearTimeout(timer);
    }
};

export const BACKEND_URL: string =
    (process.env.EXPO_PUBLIC_BACKEND_URL as string) || 'http://127.0.0.1:5000';

/**
 * fetch against the Flask API with the caller's Firebase ID token attached.
 *
 * The backend reads the user from this token, which is why no endpoint takes a
 * user_id any more: the client is not trusted to say who it is. getIdToken()
 * serves a cached token and only makes a network call when it is near expiry.
 */
export const authedFetch = async (
    path: string,
    init: RequestInit = {},
): Promise<Response> => {
    const user = auth.currentUser;
    if (!user) throw new Error('You need to be signed in to do that.');

    const headers = new Headers(init.headers ?? {});
    headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
    if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    return fetchWithTimeout(`${BACKEND_URL}${path}`, { ...init, headers });
};
