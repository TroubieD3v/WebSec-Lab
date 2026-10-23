"""CSRF lab: a bank transfer (OWASP A01:2025 Broken Access Control).

Alice is logged in to the bank; her session lives in a cookie. The *bank* endpoints
(`/bank/...`) are the vulnerable/fixed code. The *browser* endpoints (`/browser/...`)
simulate Alice's browser: they send real HTTP requests to the bank with her cookie
attached automatically, exactly like a browser does, and with the `Origin` and
`Sec-Fetch-Site` headers a browser would set. This keeps the lab identical in every
browser (SameSite defaults differ) and models the worst case: the cookie is sent.
"""

from __future__ import annotations

import hmac
import secrets
import threading
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, Cookie, Header, HTTPException, Request
from pydantic import BaseModel, Field

from common import VERIFIER_HEADER, Mode, mark_solved

LAB_ID = "csrf"
SOURCE_FILE = Path(__file__)

router = APIRouter(prefix=f"/{LAB_ID}", tags=[LAB_ID])

START_BALANCES = {"alice": 1000, "bob": 200, "mallory": 0}
ATTACKER_ORIGIN = "http://evil.example"

_lock = threading.Lock()


class State:
    def __init__(self) -> None:
        self.balances = dict(START_BALANCES)
        # Alice's browser is already logged in; the cookie value never reaches the learner.
        self.session = secrets.token_urlsafe(24)
        self.sessions = {self.session: "alice"}
        self.csrf_tokens = {self.session: secrets.token_urlsafe(24)}


STATES: dict[str, State] = {"vulnerable": State(), "fixed": State()}  # one bank per mode


def reset() -> None:
    with _lock:
        for mode in STATES:
            STATES[mode] = State()


def move_money(state: State, user: str, to: str, amount: int) -> dict[str, Any]:
    if to not in state.balances or to == user:
        raise HTTPException(400, "Unknown recipient")
    if not 0 < amount <= state.balances[user]:
        raise HTTPException(400, "Invalid amount")
    state.balances[user] -= amount
    state.balances[to] += amount
    return {"from": user, "to": to, "amount": amount, "balance": state.balances[user]}


# region vulnerable
def vulnerable_transfer(state, session, headers, own_origin, to, amount):
    user = state.sessions.get(session)
    if user is None:
        raise HTTPException(401, "Not authenticated")
    return move_money(state, user, to, amount)
# endregion


# region fixed
def fixed_transfer(state, session, headers, own_origin, to, amount):
    user = state.sessions.get(session)
    if user is None:
        raise HTTPException(401, "Not authenticated")
    if headers.get("sec-fetch-site", "same-origin") not in ("same-origin", "none"):
        raise HTTPException(403, "Cross-site request blocked")
    if headers.get("origin", own_origin) != own_origin:
        raise HTTPException(403, "Cross-site request blocked")
    expected = state.csrf_tokens[session]
    if not hmac.compare_digest(headers.get("x-csrf-token", ""), expected):
        raise HTTPException(403, "Invalid CSRF token")
    return move_money(state, user, to, amount)
# endregion


def _own_origin(request: Request) -> str:
    return f"{request.url.scheme}://{request.headers.get('host', '')}"


@router.get("/{mode}/bank/account")
def bank_account(mode: Mode, session: str | None = Cookie(None)):
    with _lock:
        state = STATES[mode]
        user = state.sessions.get(session or "")
        if user is None:
            raise HTTPException(401, "Not authenticated")
        body: dict[str, Any] = {"user": user, "balance": state.balances[user]}
        if mode == "fixed":
            body["csrf_token"] = state.csrf_tokens[session or ""]  # embedded in the page, unreadable cross-site
        return body


@router.post("/{mode}/bank/transfer")
async def bank_transfer(mode: Mode, request: Request, session: str | None = Cookie(None)):
    form = await request.form()
    try:
        to, amount = str(form.get("to", "")), int(str(form.get("amount", "")))
    except ValueError:
        raise HTTPException(400, "Invalid amount") from None
    transfer = vulnerable_transfer if mode == "vulnerable" else fixed_transfer
    with _lock:
        result = transfer(STATES[mode], session or "", request.headers, _own_origin(request), to, amount)
        if mode == "vulnerable" and request.headers.get("sec-fetch-site") == "cross-site":
            mark_solved(LAB_ID, request)
        return result


# --- simulated browser of the victim (not part of the vulnerable code) -----------------


class TransferForm(BaseModel):
    to: str = Field(max_length=20)
    amount: int = Field(ge=1, le=100000)
    strip_headers: bool = False  # simulate a browser/proxy that omits Origin and Sec-Fetch-Site


async def _browser(request: Request, mode: str, method: str, path: str, *, headers: dict[str, str], data: dict | None = None):
    """Send a request to the bank the way Alice's browser would, cookie included."""
    forward = {k: v for k, v in request.headers.items() if k == VERIFIER_HEADER}
    transport = httpx.ASGITransport(app=request.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://lab", timeout=5) as client:
        return await client.request(
            method,
            f"/{LAB_ID}/{mode}/bank/{path}",
            data=data,
            headers={"Cookie": f"session={STATES[mode].session}", **headers, **forward},
        )


def _snapshot(mode: str, response: httpx.Response) -> dict[str, Any]:
    try:
        body = response.json()
    except ValueError:
        body = {"raw": response.text[:200]}
    with _lock:
        ledger = dict(STATES[mode].balances)
    return {"bank_status": response.status_code, "bank_response": body, "ledger": ledger}


@router.get("/{mode}/browser/account")
async def browser_account(mode: Mode, request: Request):
    return _snapshot(mode, await _browser(request, mode, "GET", "account", headers={"Sec-Fetch-Site": "same-origin"}))


@router.post("/{mode}/browser/transfer")
async def browser_transfer(mode: Mode, form: TransferForm, request: Request):
    """Alice uses the bank's own page: same origin, and in fixed mode the page supplies its CSRF token."""
    headers = {"Sec-Fetch-Site": "same-origin", "Origin": "http://lab"}
    if mode == "fixed":
        account = (await _browser(request, mode, "GET", "account", headers=headers)).json()
        headers["X-CSRF-Token"] = account["csrf_token"]
    response = await _browser(request, mode, "POST", "transfer", headers=headers, data={"to": form.to, "amount": form.amount})
    return _snapshot(mode, response)


@router.post("/{mode}/browser/visit-attacker-page")
async def visit_attacker_page(mode: Mode, form: TransferForm, request: Request):
    """Alice opens evil.example, whose hidden form auto-submits to the bank. The attacker cannot read the token."""
    headers = {} if form.strip_headers else {"Sec-Fetch-Site": "cross-site", "Origin": ATTACKER_ORIGIN}
    response = await _browser(request, mode, "POST", "transfer", headers=headers, data={"to": form.to, "amount": form.amount})
    if mode == "vulnerable" and response.status_code == 200:
        mark_solved(LAB_ID, request)  # a forged request moved Alice's money
    return _snapshot(mode, response)


@router.post("/{mode}/browser/reset")
def browser_reset(mode: Mode):
    """Lets the learner repeat the experiment: new balances and a fresh session for this mode."""
    with _lock:
        STATES[mode] = State()
        return {"ledger": dict(STATES[mode].balances)}
