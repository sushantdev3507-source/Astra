"""
Session tokens -- signed JWTs, issued on login/signup, verified on
every authenticated request. Stateless by design (no server-side
session store needed): the signature alone proves the token is
genuine and unmodified, and the expiry claim inside it proves it
hasn't gone stale. This deliberately mirrors the token-based handoff
concept discussed for the future 5onam.ai auto-login integration --
both are "a signed, time-limited assertion of who this user is,"
just issued by different parties for different entry points.

ASTRA_JWT_SECRET must be set to a real secret outside local dev -- see
config.py's jwt_secret field and the startup warning in main.py.
"""
from __future__ import annotations

import time
from typing import Optional

import jwt

from app.config import settings

_ALGORITHM = "HS256"


class InvalidTokenError(Exception):
    """Raised for any invalid/expired/malformed token. Deliberately
    generic -- callers should return one uniform 401, not leak which
    specific check failed."""


def issue_token(user_id: str, email: str) -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + settings.jwt_expiry_hours * 3600,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=_ALGORITHM)


def verify_token(token: str) -> str:
    """Returns the user id (the `sub` claim) if the token is valid, or
    raises InvalidTokenError."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise InvalidTokenError("Invalid or expired session token.") from exc
    user_id = payload.get("sub")
    if not user_id:
        raise InvalidTokenError("Malformed session token.")
    return user_id


def extract_bearer_token(authorization_header: Optional[str]) -> Optional[str]:
    if not authorization_header or not authorization_header.startswith("Bearer "):
        return None
    return authorization_header[len("Bearer "):].strip() or None
