/**
 * api.ts - Backend URL config for all Flask API calls
 */
import { auth } from './firebase';

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

    return fetch(`${BACKEND_URL}${path}`, { ...init, headers });
};
