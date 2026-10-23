"""Broken Access Control lab: admin functions (OWASP A01:2025).

Two flaws of the vulnerable mode: the admin endpoint only checks that the caller
is *logged in* (function-level access control is missing), and the profile
update copies every submitted field onto the user record (mass assignment), so a
regular user can make themselves an admin.
"""

from __future__ import annotations

import copy
import threading
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict

from common import Mode, mark_blocked, mark_solved

LAB_ID = "broken-access-control"
SOURCE_FILE = Path(__file__)

router = APIRouter(prefix=f"/{LAB_ID}", tags=[LAB_ID])

# Demo tokens, valid only inside this fake dataset.
TOKENS = {"alice-demo-token": "alice", "bob-demo-token": "bob", "admin-demo-token": "root"}

SEED = {
    "alice": {"id": 1, "username": "alice", "display_name": "Alice", "email": "alice@example.test", "role": "user"},
    "bob": {"id": 2, "username": "bob", "display_name": "Bob", "email": "bob@example.test", "role": "user"},
    "root": {"id": 3, "username": "root", "display_name": "Site Admin", "email": "root@example.test", "role": "admin"},
}

_lock = threading.Lock()


class State:
    def __init__(self) -> None:
        self.users: dict[str, dict[str, Any]] = copy.deepcopy(SEED)


STATE = State()


def reset() -> None:
    global STATE
    with _lock:
        STATE = State()


def current_user(authorization: str | None) -> str:
    scheme, _, token = (authorization or "").partition(" ")
    user = TOKENS.get(token) if scheme.lower() == "bearer" else None
    if user is None:
        raise HTTPException(401, "Missing or invalid bearer token")
    return user


# region vulnerable
def vulnerable_list_users(state, user):
    return list(state.users.values())


def vulnerable_update_profile(state, user, changes):
    state.users[user].update(changes)
    return state.users[user]
# endregion


# region fixed
EDITABLE_FIELDS = {"display_name"}


def fixed_list_users(state, user):
    if state.users[user]["role"] != "admin":
        raise HTTPException(403, "Administrator role required")
    return list(state.users.values())


def fixed_update_profile(state, user, changes):
    forbidden = set(changes) - EDITABLE_FIELDS
    if forbidden:
        raise HTTPException(400, f"Fields cannot be changed: {sorted(forbidden)}")
    state.users[user].update(changes)
    return state.users[user]
# endregion


class ProfileChanges(BaseModel):
    """Accepts arbitrary JSON keys on purpose: filtering them is the handler's job."""

    model_config = ConfigDict(extra="allow")


@router.get("/{mode}/me")
def me(mode: Mode, authorization: str | None = Header(None)):
    user = current_user(authorization)
    with _lock:
        return STATE.users[user]


@router.get("/{mode}/admin/users")
def admin_users(mode: Mode, request: Request, authorization: str | None = Header(None)):
    user = current_user(authorization)
    with _lock:
        was_admin = STATE.users[user]["role"] == "admin"
        try:
            users = (vulnerable_list_users if mode == "vulnerable" else fixed_list_users)(STATE, user)
        except HTTPException as exc:
            if mode == "fixed" and exc.status_code == 403:
                mark_blocked(LAB_ID, request)  # a regular user tried the admin API
            raise
        if mode == "vulnerable" and not was_admin:
            mark_solved(LAB_ID, request)
        return {"users": users}


@router.patch("/{mode}/profile")
def update_profile(mode: Mode, changes: ProfileChanges, request: Request, authorization: str | None = Header(None)):
    user = current_user(authorization)
    submitted = changes.model_dump()
    if len(submitted) > 20:
        raise HTTPException(400, "Too many fields")
    with _lock:
        was_admin = STATE.users[user]["role"] == "admin"
        update = vulnerable_update_profile if mode == "vulnerable" else fixed_update_profile
        try:
            profile = update(STATE, user, submitted)
        except HTTPException as exc:
            if mode == "fixed" and exc.status_code == 400:
                mark_blocked(LAB_ID, request)  # privileged fields were submitted and refused
            raise
        if mode == "vulnerable" and profile["role"] == "admin" and not was_admin:
            mark_solved(LAB_ID, request)
        return profile
