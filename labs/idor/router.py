"""IDOR lab: hotel bookings (OWASP A01:2025 Broken Access Control).

Two fake users, Alice and Bob, authenticate with fixed demo bearer tokens.
Authentication works correctly in both modes; only the *authorization* check
on a single booking differs.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Header, HTTPException, Request

from common import Mode, mark_blocked, mark_solved

LAB_ID = "idor"
SOURCE_FILE = Path(__file__)

router = APIRouter(prefix=f"/{LAB_ID}", tags=[LAB_ID])

# Demo tokens: documented in the UI, valid only inside this fake dataset.
TOKENS = {"alice-demo-token": "alice", "bob-demo-token": "bob"}

BOOKINGS = {
    101: {"id": 101, "owner": "alice", "guest": "Alice Example", "hotel": "Grand Plaza", "nights": 3, "total": 540.00, "card_last4": "4242"},
    102: {"id": 102, "owner": "bob", "guest": "Bob Example", "hotel": "Seaside Resort", "nights": 7, "total": 1890.00, "card_last4": "1881"},
    103: {"id": 103, "owner": "alice", "guest": "Alice Example", "hotel": "City Loft", "nights": 2, "total": 260.00, "card_last4": "4242"},
    104: {"id": 104, "owner": "bob", "guest": "Bob Example", "hotel": "Mountain Lodge", "nights": 5, "total": 975.00, "card_last4": "1881"},
}


def reset() -> None:
    """The dataset is read-only, nothing to reset."""


def current_user(authorization: str | None) -> str:
    scheme, _, token = (authorization or "").partition(" ")
    user = TOKENS.get(token) if scheme.lower() == "bearer" else None
    if user is None:
        raise HTTPException(401, "Missing or invalid bearer token")
    return user


# region vulnerable
def vulnerable_get_booking(booking_id: int, user: str):
    booking = BOOKINGS.get(booking_id)
    if booking is None:
        raise HTTPException(404, "Booking not found")
    return booking
# endregion


# region fixed
def fixed_get_booking(booking_id: int, user: str):
    booking = BOOKINGS.get(booking_id)
    if booking is None:
        raise HTTPException(404, "Booking not found")
    if booking["owner"] != user:
        raise HTTPException(403, "You do not own this booking")
    return booking
# endregion


@router.get("/{mode}/bookings")
def list_bookings(mode: Mode, authorization: str | None = Header(None)):
    user = current_user(authorization)
    return {"user": user, "bookings": [b for b in BOOKINGS.values() if b["owner"] == user]}


@router.get("/{mode}/bookings/{booking_id}")
def get_booking(mode: Mode, booking_id: int, request: Request, authorization: str | None = Header(None)):
    user = current_user(authorization)
    get = vulnerable_get_booking if mode == "vulnerable" else fixed_get_booking
    try:
        booking = get(booking_id, user)
    except HTTPException as exc:
        if mode == "fixed" and exc.status_code == 403:
            mark_blocked(LAB_ID, request)  # someone else's booking was requested and refused
        raise
    if mode == "vulnerable" and booking["owner"] != user:
        mark_solved(LAB_ID, request)
    return booking
