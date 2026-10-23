"""Race Condition lab: single-use coupon (OWASP A06:2025 Insecure Design).

A welcome coupon adds 10 credits and may be used once per account. The vulnerable
mode checks "already used?" and records the redemption in two separate steps with a
simulated database round trip in between, so concurrent requests all pass the check.
"""

from __future__ import annotations

import threading
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from common import Mode, mark_blocked, mark_solved

LAB_ID = "race-condition"
SOURCE_FILE = Path(__file__)

router = APIRouter(prefix=f"/{LAB_ID}", tags=[LAB_ID])

COUPON_CODE = "WELCOME10"
COUPON_VALUE = 10
# Simulated database round trip: the race window. Wide enough that a burst from a slow or CPU-starved
# machine still overlaps (at 50 ms, 1 burst in 10 failed to race with a tenth of a CPU).
DB_LATENCY = 0.2
BURST_WINDOW = 1.0  # seconds
BURST_REJECTIONS = 3  # refusals inside the window that count as a parallel attack (not a double click)


class State:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.balance = 0
        self.redeemed: set[str] = set()
        self.redemptions = 0  # successful redemptions, for the UI and challenge detection
        self.rejections: list[float] = []  # recent refusals in fixed mode, to recognise a parallel burst


STATE: dict[str, State] = {"vulnerable": State(), "fixed": State()}


def reset() -> None:
    for mode in STATE:
        STATE[mode] = State()


# region vulnerable
def vulnerable_redeem(state, code):
    if code in state.redeemed:
        raise HTTPException(409, "Coupon already used")
    time.sleep(DB_LATENCY)  # database round trip
    state.balance += COUPON_VALUE
    state.redeemed.add(code)
    state.redemptions += 1
# endregion


# region fixed
def fixed_redeem(state, code):
    with state.lock:
        if code in state.redeemed:
            raise HTTPException(409, "Coupon already used")
        state.redeemed.add(code)
        state.balance += COUPON_VALUE
        state.redemptions += 1
# endregion


class RedeemBody(BaseModel):
    code: str = Field(max_length=32)


@router.get("/{mode}/wallet")
def wallet(mode: Mode):
    state = STATE[mode]
    return {"balance": state.balance, "redemptions": state.redemptions}


@router.post("/{mode}/redeem")
def redeem(mode: Mode, body: RedeemBody, request: Request):
    if body.code != COUPON_CODE:
        raise HTTPException(404, "Unknown coupon")
    state = STATE[mode]
    try:
        (vulnerable_redeem if mode == "vulnerable" else fixed_redeem)(state, body.code)
    except HTTPException as exc:
        if mode == "fixed" and exc.status_code == 409:
            now = time.monotonic()
            state.rejections = [t for t in state.rejections if now - t < BURST_WINDOW] + [now]
            if len(state.rejections) >= BURST_REJECTIONS:
                mark_blocked(LAB_ID, request)  # many simultaneous attempts, and still only one won
        raise
    if mode == "vulnerable" and state.redemptions > 1:
        mark_solved(LAB_ID, request)
    return {"balance": state.balance, "redemptions": state.redemptions}


@router.post("/{mode}/wallet/reset")
def reset_wallet(mode: Mode):
    """Lets the learner repeat the experiment without leaving the lab."""
    STATE[mode] = State()
    return {"balance": 0, "redemptions": 0}
