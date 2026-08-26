"""
auth.py - Firebase ID token verification for the execution-layer routes.

Every route that touches a user's wallet, portfolio or round-up balance must
know who is asking. Before this existed, `user_id` arrived in the request body
and was trusted, so any caller could read or credit any account by typing
someone else's uid.

Verification uses google-auth, which is already a dependency. firebase-admin
would work too but pulls in a much larger tree for the same check.
"""
import os
from functools import wraps

from flask import g, jsonify, request
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

# The Firebase project whose tokens this API accepts. Pinned in .firebaserc on
# the frontend side; kept overridable so a fork can point at its own project.
FIREBASE_PROJECT_ID = os.getenv('FIREBASE_PROJECT_ID', 'finsight-f423d')

_ISSUER = f'https://securetoken.google.com/{FIREBASE_PROJECT_ID}'

# One session, reused. Building a transport per request would open a new TLS
# connection to Google's cert endpoint every time.
_transport = google_requests.Request()


class AuthError(Exception):
    """Raised when a request cannot be attributed to a signed-in user."""

    def __init__(self, message: str, status: int = 401):
        super().__init__(message)
        self.message = message
        self.status = status


def _bearer_token() -> str:
    header = request.headers.get('Authorization', '')
    scheme, _, token = header.partition(' ')
    if scheme.lower() != 'bearer' or not token.strip():
        raise AuthError('Authorization header must be "Bearer <firebase-id-token>"')
    return token.strip()


def verify_id_token(token: str) -> str:
    """Return the uid for a valid Firebase ID token, or raise AuthError."""
    try:
        claims = id_token.verify_firebase_token(
            token, _transport, audience=FIREBASE_PROJECT_ID
        )
    except Exception as exc:
        # Covers expired, malformed, wrong-audience and bad-signature tokens.
        # The reason is logged but not returned: it tells an attacker which
        # part of a forged token to fix next.
        print(f'[auth] Token rejected: {exc}')
        raise AuthError('Invalid or expired token') from exc

    if not claims:
        raise AuthError('Invalid or expired token')

    # verify_firebase_token checks signature, audience and expiry, but not the
    # issuer. A token minted by a different Firebase project carries a valid
    # Google signature, so without this check it would be accepted.
    if claims.get('iss') != _ISSUER:
        print(f"[auth] Token rejected: issuer {claims.get('iss')!r}")
        raise AuthError('Invalid or expired token')

    uid = (claims.get('sub') or '').strip()
    if not uid:
        raise AuthError('Invalid or expired token')

    return uid


def require_auth(view):
    """
    Reject the request unless it carries a valid Firebase ID token.

    On success the verified uid is available as `g.uid`. Routes must read the
    user from there and never from the query string or body.
    """
    @wraps(view)
    def wrapper(*args, **kwargs):
        try:
            g.uid = verify_id_token(_bearer_token())
        except AuthError as exc:
            return jsonify({'error': exc.message}), exc.status
        return view(*args, **kwargs)

    return wrapper
