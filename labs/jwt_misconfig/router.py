"""JWT Misconfiguration lab (OWASP A07:2025 Authentication Failures).

A minimal HS256 JWT implementation (standard library only). The vulnerable
verifier trusts the token's own `alg` header (so `alg: none` skips the signature),
signs with a guessable secret, and never checks `exp`. The fixed verifier pins the
algorithm, uses a random secret and validates the claims. All values are fake.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import threading
import time
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

from common import Mode, mark_blocked, mark_solved

LAB_ID = "jwt"
SOURCE_FILE = Path(__file__)

router = APIRouter(prefix=f"/{LAB_ID}", tags=[LAB_ID])

USERS = {"alice": ("wonderland", "user"), "admin": ("Tr0ub4dor&3", "admin")}
WEAK_SECRET = b"secret"  # appears in every wordlist
TOKEN_TTL = 900

_lock = threading.Lock()


class State:
    def __init__(self) -> None:
        self.strong_secret = secrets.token_bytes(32)
        self.issued: set[str] = set()  # for challenge detection only


STATE = State()


def reset() -> None:
    global STATE
    with _lock:
        STATE = State()


def b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def b64d(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def sign(header: dict[str, Any], claims: dict[str, Any], secret: bytes) -> str:
    signing_input = f"{b64e(json.dumps(header, separators=(',', ':')).encode())}.{b64e(json.dumps(claims, separators=(',', ':')).encode())}"
    signature = hmac.new(secret, signing_input.encode(), hashlib.sha256).digest()
    return f"{signing_input}.{b64e(signature)}"


def parse(token: str) -> tuple[dict[str, Any], dict[str, Any], bytes, str]:
    try:
        head, body, sig = token.split(".")
        header, claims = json.loads(b64d(head)), json.loads(b64d(body))
        if not isinstance(header, dict) or not isinstance(claims, dict):
            raise ValueError
        return header, claims, b64d(sig), f"{head}.{body}"
    except (ValueError, TypeError, json.JSONDecodeError):
        raise HTTPException(401, "Malformed token") from None


# region vulnerable
def vulnerable_issue(state, username, role):
    return sign({"alg": "HS256", "typ": "JWT"}, {"sub": username, "role": role}, WEAK_SECRET)


def vulnerable_verify(state, token):
    header, claims, signature, signing_input = parse(token)
    if header.get("alg") != "none":
        expected = hmac.new(WEAK_SECRET, signing_input.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(signature, expected):
            raise HTTPException(401, "Bad signature")
    return claims
# endregion


# region fixed
def fixed_issue(state, username, role):
    claims = {"sub": username, "role": role, "iat": int(time.time()), "exp": int(time.time()) + TOKEN_TTL}
    return sign({"alg": "HS256", "typ": "JWT"}, claims, state.strong_secret)


def fixed_verify(state, token):
    header, claims, signature, signing_input = parse(token)
    if header.get("alg") != "HS256":
        raise HTTPException(401, "Unsupported algorithm")
    expected = hmac.new(state.strong_secret, signing_input.encode(), hashlib.sha256).digest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(401, "Bad signature")
    exp = claims.get("exp")
    if not isinstance(exp, (int, float)) or exp < time.time() or "sub" not in claims:
        raise HTTPException(401, "Token expired or incomplete")
    return claims
# endregion


class LoginBody(BaseModel):
    username: str = Field(max_length=64)
    password: str = Field(max_length=128)


def _bearer(authorization: str | None) -> str:
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(401, "Missing bearer token")
    return token


@router.post("/{mode}/login")
def login(mode: Mode, body: LoginBody):
    entry = USERS.get(body.username)
    if entry is None or not hmac.compare_digest(entry[0], body.password):
        raise HTTPException(401, "Invalid credentials")
    with _lock:
        token = (vulnerable_issue if mode == "vulnerable" else fixed_issue)(STATE, body.username, entry[1])
        STATE.issued.add(token)
    return {"token": token}


@router.get("/{mode}/me")
def me(mode: Mode, authorization: str | None = Header(None)):
    claims = (vulnerable_verify if mode == "vulnerable" else fixed_verify)(STATE, _bearer(authorization))
    return {"user": claims.get("sub"), "role": claims.get("role")}


@router.get("/{mode}/admin")
def admin(mode: Mode, request: Request, authorization: str | None = Header(None)):
    token = _bearer(authorization)
    with _lock:
        forged = token not in STATE.issued
    try:
        claims = (vulnerable_verify if mode == "vulnerable" else fixed_verify)(STATE, token)
    except HTTPException:
        if mode == "fixed" and forged:
            mark_blocked(LAB_ID, request)  # a forged token was presented to the admin area and refused
        raise
    if claims.get("role") != "admin":
        raise HTTPException(403, "Administrator role required")
    if mode == "vulnerable" and forged:
        mark_solved(LAB_ID, request)
    return {"secret": "The admin panel: rotate all API keys before Friday.", "user": claims.get("sub")}
