"""
User model and the storage abstraction every auth endpoint depends on.

TEMPORARY STORAGE, BY DESIGN: InMemoryUserRepository (in-memory.py) is a
plain Python dict -- ALL ACCOUNTS ARE LOST WHEN THE BACKEND RESTARTS.
This is a deliberate, explicitly-scoped placeholder, not an oversight:
the team has not yet confirmed which real database Astra will use, and
this project's established pattern (see InpaintingProvider in
app/services/inpainting/) is to build against a small interface first
so swapping in a real backend later touches ONE file, not every auth
endpoint.

When a real database is confirmed, implement UserRepository against it
(e.g. RedisUserRepository, PostgresUserRepository) and change ONE line
in app/services/auth/factory.py. Nothing in app/api/auth.py or the
password/token logic needs to change.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class User:
    id: str
    email: str
    name: str
    password_hash: str
    created_at: float  # epoch seconds


class UserAlreadyExistsError(Exception):
    """Raised when signup is attempted with an email already on file."""


class UserRepository(ABC):
    @abstractmethod
    async def create_user(self, email: str, name: str, password_hash: str) -> User:
        """Raises UserAlreadyExistsError if the email is already registered."""
        raise NotImplementedError

    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[User]:
        raise NotImplementedError

    @abstractmethod
    async def get_by_id(self, user_id: str) -> Optional[User]:
        raise NotImplementedError
