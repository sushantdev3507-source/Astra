"""
Auth endpoint tests. Uses the shared in-memory repository singleton --
tests run against real signup/login/me logic, not mocks, but share
state across the test module's run (same as the real backend process
would). Each test uses a unique email to avoid collisions.
"""
import itertools

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_email_counter = itertools.count()


def _unique_email() -> str:
    return f"user{next(_email_counter)}@example.com"


def test_signup_creates_account_and_returns_token():
    resp = client.post(
        "/api/v1/auth/signup",
        json={"email": _unique_email(), "password": "correct-horse", "name": "Ash"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["token"]
    assert body["user"]["name"] == "Ash"
    assert "password" not in body["user"]
    assert "password_hash" not in body["user"]


def test_signup_duplicate_email_rejected():
    email = _unique_email()
    first = client.post("/api/v1/auth/signup", json={"email": email, "password": "correct-horse", "name": "Ash"})
    assert first.status_code == 201

    second = client.post("/api/v1/auth/signup", json={"email": email, "password": "different-pw", "name": "Ash2"})
    assert second.status_code == 409


def test_signup_rejects_short_password():
    resp = client.post(
        "/api/v1/auth/signup", json={"email": _unique_email(), "password": "short", "name": "Ash"}
    )
    assert resp.status_code == 422


def test_signup_rejects_invalid_email():
    resp = client.post(
        "/api/v1/auth/signup", json={"email": "not-an-email", "password": "correct-horse", "name": "Ash"}
    )
    assert resp.status_code == 422


def test_login_with_correct_credentials_succeeds():
    email = _unique_email()
    client.post("/api/v1/auth/signup", json={"email": email, "password": "correct-horse", "name": "Ash"})

    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "correct-horse"})
    assert resp.status_code == 200
    assert resp.json()["token"]


def test_login_with_wrong_password_rejected():
    email = _unique_email()
    client.post("/api/v1/auth/signup", json={"email": email, "password": "correct-horse", "name": "Ash"})

    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "wrong-password"})
    assert resp.status_code == 401


def test_login_with_unknown_email_rejected():
    resp = client.post("/api/v1/auth/login", json={"email": _unique_email(), "password": "whatever123"})
    assert resp.status_code == 401


def test_login_wrong_password_and_unknown_email_give_identical_error():
    """Must not let a caller distinguish 'wrong password' from 'no such
    account' -- that difference is exactly what lets an attacker
    enumerate which emails have registered accounts."""
    email = _unique_email()
    client.post("/api/v1/auth/signup", json={"email": email, "password": "correct-horse", "name": "Ash"})

    wrong_password = client.post("/api/v1/auth/login", json={"email": email, "password": "wrong"})
    unknown_email = client.post("/api/v1/auth/login", json={"email": _unique_email(), "password": "wrong"})
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json()["detail"] == unknown_email.json()["detail"]


def test_me_with_valid_token_returns_current_user():
    email = _unique_email()
    signup = client.post("/api/v1/auth/signup", json={"email": email, "password": "correct-horse", "name": "Ash"})
    token = signup.json()["token"]

    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == email


def test_me_without_token_rejected():
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_me_with_garbage_token_rejected():
    resp = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert resp.status_code == 401


def test_me_with_malformed_authorization_header_rejected():
    resp = client.get("/api/v1/auth/me", headers={"Authorization": "not-bearer-scheme xyz"})
    assert resp.status_code == 401


def test_password_is_never_returned_anywhere():
    email = _unique_email()
    signup = client.post(
        "/api/v1/auth/signup", json={"email": email, "password": "correct-horse-battery", "name": "Ash"}
    )
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "correct-horse-battery"})
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {signup.json()['token']}"})

    for resp in (signup, login, me):
        body_text = resp.text
        assert "correct-horse-battery" not in body_text
        assert "password_hash" not in body_text


def test_token_from_signup_and_login_both_work_for_me():
    """A token issued at signup and one issued later at login for the
    SAME account must both independently authenticate -- proves tokens
    aren't tied to a single-use signup flow."""
    email = _unique_email()
    signup = client.post("/api/v1/auth/signup", json={"email": email, "password": "correct-horse", "name": "Ash"})
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "correct-horse"})

    signup_me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {signup.json()['token']}"})
    login_me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {login.json()['token']}"})
    assert signup_me.status_code == login_me.status_code == 200
    assert signup_me.json()["id"] == login_me.json()["id"]
