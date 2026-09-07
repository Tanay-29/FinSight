/**
 * Races a promise against a deadline.
 *
 * Firestore's write calls (`addDoc`, `updateDoc`, `setDoc`) never resolve
 * while offline. There is no IndexedDB on React Native, so the SDK has no
 * local write to resolve against and simply waits for a server it cannot
 * reach. A student with no signal who taps Save on their first expense gets a
 * spinner that never stops and no error explaining why, which is the worst
 * possible moment for the app to go quiet: it is exactly when someone is most
 * likely to be logging something, at a counter, on a train.
 *
 * The rejection carries `code: 'deadline-exceeded'`, the same code Firestore
 * itself uses for a slow round trip, so it resolves through the mapping
 * `utils/errors.ts` already has rather than adding a second one.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            const error = new Error('That took too long.') as Error & { code: string };
            error.code = 'deadline-exceeded';
            reject(error);
        }, ms);
        promise.then(
            (value) => { clearTimeout(timer); resolve(value); },
            (error) => { clearTimeout(timer); reject(error); },
        );
    });
}
