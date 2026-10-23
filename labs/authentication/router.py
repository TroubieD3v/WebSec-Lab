"""Broken Authentication lab (OWASP A07:2025 Authentication Failures).

Demonstrates four classic flaws in the vulnerable mode: user enumeration,
unlimited login attempts, predictable session tokens and logout that does not
invalidate the server-side session. Passwords below are fake demo values.
"""

from __future__ import annotations

import hashlib
import hmac
import itertools
import secrets
import threading
import time
from pathlib import Path

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

from common import Mode, mark_blocked, mark_solved

LAB_ID = "broken-auth"
SOURCE_FILE = Path(__file__)

router = APIRouter(prefix=f"/{LAB_ID}", tags=[LAB_ID])

DEMO_USERS = {"alice": "sunshine", "admin": "dragon"}

MAX_FAILURES = 5
LOCK_SECONDS = 30  # deliberately short so the lab is easy to repeat
SESSION_TTL = 900
BRUTE_FORCE_THRESHOLD = 10  # failed guesses before a success counts as "brute forced"


def _hash(password: str, salt: bytes) -> bytes:
    return hashlib.scrypt(password.encode(), salt=salt, n=2**12, r=8, p=1)


class State:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        # vulnerable mode
        self.plain = dict(DEMO_USERS)
        self.sessions: dict[str, str] = {}
        self.counter = itertools.count(1001)
        # fixed mode
        self.hashed = {}
        for name, password in DEMO_USERS.items():
            salt = secrets.token_bytes(16)
            self.hashed[name] = (salt, _hash(password, salt))
        self.dummy = (secrets.token_bytes(16), _hash(secrets.token_urlsafe(8), b"x" * 16))
        self.secure_sessions: dict[str, tuple[str, float]] = {}
        self.failures: dict[str, list[float]] = {}
        # exploit detection (not part of the displayed code)
        self.vuln_failures: dict[str, int] = {}
        self.logged_out: set[str] = set()


STATE = State()


def reset() -> None:
    global STATE
    STATE = State()


def bearer(authorization: str | None) -> str:
    scheme, _, token = (authorization or "").partition(" ")
    return token if scheme.lower() == "bearer" else ""


# region vulnerable
def vulnerable_login(state, username, password):
    if username not in state.plain:
        raise HTTPException(404, "Unknown user")
    if state.plain[username] != password:
        raise HTTPException(401, "Wrong password")
    token = f"sess-{next(state.counter)}"
    state.sessions[token] = username
    return token


def vulnerable_logout(state, token):
    # The client "forgets" the token; the server-side session stays valid.
    return None


def vulnerable_me(state, token):
    return state.sessions.get(token)
# endregion


# region fixed
def fixed_login(state, username, password):
    now = time.monotonic()
    recent = [t for t in state.failures.get(username, []) if now - t < LOCK_SECONDS]
    state.failures[username] = recent
    if len(recent) >= MAX_FAILURES:
        raise HTTPException(429, "Too many attempts", headers={"Retry-After": str(LOCK_SECONDS)})
    salt, expected = state.hashed.get(username, state.dummy)
    valid = hmac.compare_digest(_hash(password, salt), expected) and username in state.hashed
    if not valid:
        recent.append(now)
        raise HTTPException(401, "Invalid credentials")
    state.failures.pop(username, None)
    token = secrets.token_urlsafe(32)
    state.secure_sessions[token] = (username, now + SESSION_TTL)
    return token


def fixed_logout(state, token):
    state.secure_sessions.pop(token, None)


def fixed_me(state, token):
    username, expires = state.secure_sessions.get(token, (None, 0.0))
    if username is None or time.monotonic() > expires:
        state.secure_sessions.pop(token, None)
        return None
    return username
# endregion


class LoginBody(BaseModel):
    username: str = Field(max_length=64)
    password: str = Field(max_length=128)


@router.post("/{mode}/login")
def login(mode: Mode, body: LoginBody, request: Request):
    with STATE.lock:
        if mode == "fixed":
            try:
                return {"token": fixed_login(STATE, body.username, body.password)}
            except HTTPException as exc:
                if exc.status_code == 429:
                    mark_blocked(LAB_ID, request)  # password guessing ran into the lockout
                raise
        try:
            token = vulnerable_login(STATE, body.username, body.password)
        except HTTPException:
            STATE.vuln_failures[body.username] = STATE.vuln_failures.get(body.username, 0) + 1
            raise
        if STATE.vuln_failures.get(body.username, 0) >= BRUTE_FORCE_THRESHOLD:
            mark_solved(LAB_ID, request)
        return {"token": token}


@router.get("/{mode}/me")
def me(mode: Mode, request: Request, authorization: str | None = Header(None)):
    token = bearer(authorization)
    with STATE.lock:
        user = (fixed_me if mode == "fixed" else vulnerable_me)(STATE, token)
        if user is None:
            if mode == "fixed" and token in STATE.logged_out:
                mark_blocked(LAB_ID, request)  # a session was reused after logout and refused
            raise HTTPException(401, "Not authenticated")
        if mode == "vulnerable" and token in STATE.logged_out:
            mark_solved(LAB_ID, request)
        return {"username": user, "mode": mode}


@router.post("/{mode}/logout")
def logout(mode: Mode, authorization: str | None = Header(None)):
    token = bearer(authorization)
    with STATE.lock:
        if mode == "fixed":
            if token in STATE.secure_sessions:
                STATE.logged_out.add(token)
            fixed_logout(STATE, token)
        else:
            vulnerable_logout(STATE, token)
            if token in STATE.sessions:
                STATE.logged_out.add(token)
    return {"detail": "Logged out"}
