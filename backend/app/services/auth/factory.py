"""
Single place that decides which UserRepository implementation is
active. Currently always the in-memory placeholder -- when a real
database is confirmed, this is the ONE function that changes.
"""
from __future__ import annotations

from app.services.auth.in_memory import get_in_memory_user_repository
from app.services.auth.repository import UserRepository


def get_user_repository() -> UserRepository:
    return get_in_memory_user_repository()
