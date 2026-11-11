/**
 * Two web globals that Hermes does not have and firebase/ai relies on.
 *
 * firebase/ai starts a 180 second timer for every request and, when it runs
 * out, aborts with `new DOMException(...)`. With no DOMException the timer
 * threw a ReferenceError and the app closed. A request left hanging when the
 * app went to the background was enough: the timer fired the moment the app
 * came back, and the next launch showed "FinSight closed last time".
 *
 * It also joins its own timeout to the caller's signal with AbortSignal.any,
 * which the AbortSignal React Native ships may not have. Both are defined
 * only when missing, so a runtime that has them keeps its own.
 *
 * Imported first in index.ts, before anything that might reach the network.
 */

const g = globalThis as unknown as {
    DOMException?: unknown;
    AbortSignal?: { any?: (signals: AbortSignal[]) => AbortSignal };
};

if (typeof g.DOMException === 'undefined') {
    class DOMException extends Error {
        constructor(message = '', name = 'Error') {
            super(message);
            this.name = name;
        }
    }
    g.DOMException = DOMException;
}

if (g.AbortSignal && typeof g.AbortSignal.any !== 'function') {
    g.AbortSignal.any = (signals: AbortSignal[]) => {
        const controller = new AbortController();
        const already = signals.find((s) => s.aborted);
        if (already) {
            controller.abort(already.reason);
            return controller.signal;
        }
        const onAbort = (e: Event) => {
            signals.forEach((s) => s.removeEventListener('abort', onAbort));
            controller.abort((e.target as AbortSignal | null)?.reason);
        };
        signals.forEach((s) => s.addEventListener('abort', onAbort));
        return controller.signal;
    };
}

export {};
