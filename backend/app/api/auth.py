"""
Auth endpoints: POST /signup, POST /login, GET /me.

No logout endpoint -- with stateless JWTs and no server-side session
store (see tokens.py's module docstring), "logging out" is simply the
client discarding its stored token. A real server-side invalidation
mechanism (a revocation list) would be reasonable to add once a real
database exists, but is out of scope for this placeholder.
"""
from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException

from app.schemas.auth import AuthResponse, LoginRequest, SignupRequest, UserResponse
from app.services.auth.factory import get_user_repository
from app.services.auth.passwords import hash_password, verify_password
from app.services.auth.repository import UserAlreadyExistsError
from app.services.auth.tokens import InvalidTokenError, extract_bearer_token, issue_token, verify_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse, status_code=201)
async def signup(body: SignupRequest) -> AuthResponse:
    repo = get_user_repository()
    try:
        user = await repo.create_user(
            email=body.email, name=body.name, password_hash=hash_password(body.password)
        )
    except UserAlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    token = issue_token(user.id, user.email)
    return AuthResponse(token=token, user=UserResponse(id=user.id, email=user.email, name=user.name))


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest) -> AuthResponse:
    repo = get_user_repository()
    user = await repo.get_by_email(body.email)
    # Deliberately identical error for "no such user" and "wrong
    # password" -- distinguishing them lets an attacker enumerate
    # which emails have accounts.
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = issue_token(user.id, user.email)
    return AuthResponse(token=token, user=UserResponse(id=user.id, email=user.email, name=user.name))


@router.get("/me", response_model=UserResponse)
async def me(authorization: str | None = Header(default=None)) -> UserResponse:
    token = extract_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header.")
    try:
        user_id = verify_token(token)
    except InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    repo = get_user_repository()
    user = await repo.get_by_id(user_id)
    if not user:
        # Valid token, but the account is gone -- e.g. the in-memory
        # store was wiped by a backend restart (see repository.py).
        # This is a real, expected occurrence with the current
        # placeholder storage, not a bug -- the frontend should treat
        # this the same as "not logged in" and clear its stored token.
        raise HTTPException(status_code=401, detail="Account not found -- please sign in again.")

    return UserResponse(id=user.id, email=user.email, name=user.name)
