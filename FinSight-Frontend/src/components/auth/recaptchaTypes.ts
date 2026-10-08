import type { ApplicationVerifier } from 'firebase/auth';

/**
 * What Firebase's phone sign-in calls on the verifier it is given.
 *
 * `verify` must resolve a reCAPTCHA v2 token. `_reset` is not on the public
 * type but the SDK calls it once the code has been requested, success or not,
 * so both implementations provide it.
 */
export type RecaptchaVerifierHandle = ApplicationVerifier & { _reset: () => void };

/** An error carrying a code, so friendlyError can word it. */
export const codedError = (code: string): Error => Object.assign(new Error(code), { code });
