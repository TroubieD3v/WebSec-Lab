"""Security Misconfiguration lab (OWASP A02:2025).

Three classic misconfigurations in the vulnerable mode: an exposed debug endpoint
with secrets, stack traces in error responses, and missing security headers plus
technology banners. All secrets below are fake.
"""

from __future__ import annotations

import logging
import traceback
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from common import Mode, mark_solved

LAB_ID = "security-misconfiguration"
SOURCE_FILE = Path(__file__)

router = APIRouter(prefix=f"/{LAB_ID}", tags=[LAB_ID])
log = logging.getLogger("websec.misconfig")

CONFIG = {
    "debug": True,
    "version": "2.3.1",
    "database_url": "postgres://shop:Sup3rS3cret@db.internal:5432/shop",
    "secret_key": "dev-secret-key-123",
}
ORDERS = {
    1001: {"id": 1001, "item": "Wireless Mouse", "total": 24.99},
    1002: {"id": 1002, "item": "USB-C Hub", "total": 39.50},
}


def reset() -> None:
    """The lab is stateless, nothing to reset."""


# region vulnerable
def vulnerable_headers():
    return {"X-Powered-By": "ShopFramework/2.3.1 (Python 3.9)", "X-App-Version": CONFIG["version"]}


def vulnerable_debug_config():
    return CONFIG


def vulnerable_error(exc):
    return 500, {"error": str(exc), "trace": traceback.format_exc()}
# endregion


# region fixed
def fixed_headers():
    return {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    }


def fixed_debug_config():
    raise HTTPException(404, "Not found")


def fixed_error(exc):
    incident = uuid.uuid4().hex[:8]
    log.error("order lookup failed (incident %s)", incident, exc_info=exc)
    return 500, {"error": "Internal server error", "incident": incident}
# endregion


def _respond(mode: str, status: int, body: object) -> JSONResponse:
    headers = vulnerable_headers() if mode == "vulnerable" else fixed_headers()
    return JSONResponse(body, status_code=status, headers=headers)


@router.get("/{mode}/ping")
def ping(mode: Mode):
    return _respond(mode, 200, {"status": "ok"})


@router.get("/{mode}/orders/{order_ref}")
def order(mode: Mode, order_ref: str, request: Request):
    try:
        found = ORDERS.get(int(order_ref))
        if found is None:
            return _respond(mode, 404, {"error": "Order not found"})
        return _respond(mode, 200, found)
    except ValueError as exc:
        status, body = (vulnerable_error if mode == "vulnerable" else fixed_error)(exc)
        if mode == "vulnerable":
            mark_solved(LAB_ID, request)
        return _respond(mode, status, body)


@router.get("/{mode}/debug/config")
def debug_config(mode: Mode, request: Request):
    config = (vulnerable_debug_config if mode == "vulnerable" else fixed_debug_config)()
    if mode == "vulnerable":
        mark_solved(LAB_ID, request)
    return _respond(mode, 200, config)
