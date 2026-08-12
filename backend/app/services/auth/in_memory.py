"""
Temporary, non-persistent UserRepository implementation. See
repository.py's module docstring for why this exists and how it's
meant to be replaced once a real database is confirmed.

Thread/async-safety note: FastAPI's default dev server is single-
process, single-event-loop, so a plain dict is safe here without
additional locking -- this would need reconsideration (or, more
likely, would simply already be replaced by a real database) before
any multi-worker production deployment.
"""
from __future__ import annotations

import time
import uuid
from typing import Optional

from app.services.auth.repository import User, UserAlreadyExistsError, UserRepository


class InMemoryUserRepository(UserRepository):
    def __init__(self) -> None:
        self._users_by_id: dict[str, User] = {}
        self._email_index: dict[str, str] = {}  # lowercased email -> user id

    async def create_user(self, email: str, name: str, password_hash: str) -> User:
        key = email.strip().lower()
        if key in self._email_index:
            raise UserAlreadyExistsError(f"An account with email {email} already exists.")
        user = User(
            id=f"user_{uuid.uuid4().hex[:16]}",
            email=email.strip(),
            name=name.strip(),
            password_hash=password_hash,
            created_at=time.time(),
        )
        self._users_by_id[user.id] = user
        self._email_index[key] = user.id
        return user

    async def get_by_email(self, email: str) -> Optional[User]:
        user_id = self._email_index.get(email.strip().lower())
        return self._users_by_id.get(user_id) if user_id else None

    async def get_by_id(self, user_id: str) -> Optional[User]:
        return self._users_by_id.get(user_id)


# Module-level singleton -- intentional. This mirrors how the mock
# inpainting provider or an in-process job registry would work: state
# needs to survive across requests within the same running backend
# process, but not across restarts. See repository.py for the
# swap-to-real-database path.
_shared_instance = InMemoryUserRepository()


def get_in_memory_user_repository() -> InMemoryUserRepository:
    return _shared_instance
