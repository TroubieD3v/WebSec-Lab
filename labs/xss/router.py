"""Reflected XSS lab: search page (OWASP A05:2025 Injection).

The dashboard embeds these pages in an iframe with `sandbox="allow-scripts"`
(no `allow-same-origin`), served from a different origin than the dashboard.
`lab.js` turns `alert()` into a message to the dashboard, which is how the
platform detects that injected JavaScript actually ran.
"""

from __future__ import annotations

import html
from pathlib import Path

from fastapi import APIRouter, Query, Request, Response
from fastapi.responses import HTMLResponse

from common import Mode, lab_js, mark_solved, render_page

LAB_ID = "xss"
SOURCE_FILE = Path(__file__)

router = APIRouter(prefix=f"/{LAB_ID}", tags=[LAB_ID])

# Defence in depth for the fixed mode: even if escaping were missed, inline
# script and event handlers would not run.
FIXED_CSP = "default-src 'none'; script-src 'self'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'"


def reset() -> None:
    """The lab is stateless, nothing to reset."""


# region vulnerable
def vulnerable_render(q):
    return f"<h2>Search results for: {q}</h2><p>No products found.</p>"
# endregion


# region fixed
def fixed_render(q):
    return f"<h2>Search results for: {html.escape(q)}</h2><p>No products found.</p>"
# endregion


@router.get("/static/lab.js")
def serve_lab_js() -> Response:
    return Response(lab_js(LAB_ID), media_type="application/javascript; charset=utf-8")


@router.get("/{mode}/search", response_class=HTMLResponse)
def search(mode: Mode, q: str = Query("", max_length=2000)):
    render = vulnerable_render if mode == "vulnerable" else fixed_render
    page = render_page(LAB_ID, mode, "Shop search", render(q))
    headers = {"Content-Security-Policy": FIXED_CSP} if mode == "fixed" else {}
    return HTMLResponse(page, headers=headers)


@router.get("/{mode}/beacon", status_code=204)
def beacon(mode: Mode, request: Request) -> Response:
    if mode == "vulnerable":
        mark_solved(LAB_ID, request)
    return Response(status_code=204)
