"""
cache.py - small in-process TTL cache.

Every Gemini and Yahoo call the app makes is either identical for all users
(market commentary), identical for the same input (flashcards for a module), or
identical until the user's data changes (the IQ coach). Without a cache, one
Feed open per user is one Gemini call, which burns the free tier for content
that did not change.

This is deliberately in-process rather than Redis: the app runs a single
gunicorn worker (see Procfile), so a dict is enough and adds no dependency.
If the worker count is ever raised, each worker keeps its own copy, which stays
correct but caches less effectively.
"""
import hashlib
import json
import threading
import time


class TTLCache:
    """Thread-safe key/value store where entries expire after a set time."""

    def __init__(self, max_entries: int = 256):
        self._store: dict[str, tuple[float, object]] = {}
        self._lock = threading.Lock()
        self._max_entries = max_entries

    def get(self, key: str):
        """Return the cached value, or None if missing or expired."""
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            expires_at, value = entry
            if time.time() >= expires_at:
                del self._store[key]
                return None
            return value

    def set(self, key: str, value, ttl_seconds: float) -> None:
        with self._lock:
            if len(self._store) >= self._max_entries:
                self._evict_locked()
            self._store[key] = (time.time() + ttl_seconds, value)

    def _evict_locked(self) -> None:
        """Drop expired entries, then the soonest-to-expire if still full."""
        now = time.time()
        for key in [k for k, (exp, _) in self._store.items() if exp <= now]:
            del self._store[key]
        if len(self._store) >= self._max_entries:
            oldest = min(self._store, key=lambda k: self._store[k][0])
            del self._store[oldest]

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def stats(self) -> dict:
        with self._lock:
            now = time.time()
            return {
                "entries": len(self._store),
                "live": sum(1 for exp, _ in self._store.values() if exp > now),
                "max_entries": self._max_entries,
            }


def make_key(*parts) -> str:
    """
    Stable cache key from arbitrary JSON-serialisable parts.

    Hashed rather than concatenated because flashcard input includes a whole
    module's text, which is far too long to use as a dict key directly.
    """
    blob = json.dumps(parts, sort_keys=True, default=str)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


# Shared instance. Import this, do not build your own.
cache = TTLCache()

# ── How long each kind of response stays fresh ───────────────────────────────

# Flashcards are a pure function of the module text, which does not change.
TTL_FLASHCARDS = 24 * 60 * 60

# Coaching depends on the user's own data. The key already includes that data,
# so this only expires entries for states the user has moved on from.
TTL_AI_ADVISOR = 60 * 60
