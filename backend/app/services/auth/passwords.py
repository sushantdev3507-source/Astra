"""
Password hashing -- bcrypt, industry-standard for this purpose (salted
automatically, deliberately slow to resist brute-forcing). Plaintext
passwords are never stored, logged, or held longer than needed to hash
or verify them.
"""
from __future__ import annotations

import bcrypt

MIN_PASSWORD_LENGTH = 8


def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        # Malformed hash -- treat as "does not match" rather than raising,
        # so a corrupted record fails a login cleanly instead of 500ing.
        return False
