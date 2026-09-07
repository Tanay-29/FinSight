"""
ratelimit.py - per-uid rate limiting for the two routes that call Gemini.

The cache in cache.py blunts repeat calls with IDENTICAL inputs, but the
ai-advisor cache key is built from the caller's own transaction, budget and
goal summaries (see main.py), so a signed-in user misses the cache on every
call simply by changing one amount by a rupee. Without a limit independent of
what is being asked for, one account can drive unbounded Gemini spend against
a key held in a single Render environment variable, and the service already
runs one worker with four threads (see Procfile), so four concurrent calls
already occupy every thread and /health stops answering under load.

In-process rather than Redis, for the same reason cache.py gives: this runs on
one gunicorn worker, so a dict with a lock is enough and adds no dependency. It
would need revisiting, same as the cache, if the worker count is ever raised.
"""
import threading
import time
from functools import wraps

from flask import g, jsonify


class RateLimiter:
    """Allows at most `limit` calls in any trailing `window_seconds`, per key."""

    def __init__(self, limit: int, window_seconds: float):
        self._limit = limit
        self._window = window_seconds
        self._hits: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        now = time.time()
        with self._lock:
            hits = [t for t in self._hits.get(key, []) if now - t < self._window]
            if len(hits) >= self._limit:
                self._hits[key] = hits
                return False
            hits.append(now)
            self._hits[key] = hits
            return True

    def retry_after_seconds(self, key: str) -> int:
        """How long until the oldest hit in the window falls out of it."""
        with self._lock:
            hits = self._hits.get(key, [])
            if not hits:
                return 0
            return max(1, int(self._window - (time.time() - hits[0])) + 1)


def rate_limited(limiter: RateLimiter):
    """
    Reject the request if this uid has hit the limit.

    Must sit below `@require_auth` in the decorator stack so that `g.uid` is
    already set by the time this runs: `@require_auth` above `@rate_limited`
    means require_auth's wrapper executes first at call time.
    """
    def decorator(view):
        @wraps(view)
        def wrapper(*args, **kwargs):
            if not limiter.allow(g.uid):
                retry_after = limiter.retry_after_seconds(g.uid)
                response = jsonify({
                    'error': 'Too many requests. Wait a few minutes and try again.'
                })
                response.status_code = 429
                response.headers['Retry-After'] = str(retry_after)
                return response
            return view(*args, **kwargs)
        return wrapper
    return decorator
