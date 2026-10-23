"""Stored XSS lab: guestbook (OWASP A05:2025 Injection).

Comments are stored as typed (input is never "sanitised") and rendered on a
page that the dashboard embeds in a sandboxed iframe from a separate origin.
The vulnerable mode writes them into the HTML raw; the fixed mode encodes on
output and adds a Content-Security-Policy.
"""

from __future__ import annotations

import html
import threading
from pathlib import Path

from fastapi import APIRouter, Request, Response
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from common import Mode, lab_js, mark_blocked, mark_solved, render_page

LAB_ID = "stored-xss"
SOURCE_FILE = Path(__file__)

router = APIRouter(prefix=f"/{LAB_ID}", tags=[LAB_ID])

MAX_COMMENTS = 30
FIXED_CSP = "default-src 'none'; script-src 'self'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'"

_lock = threading.Lock()
_comments: dict[str, list[dict[str, str]]] = {"vulnerable": [], "fixed": []}


def reset() -> None:
    with _lock:
        for comments in _comments.values():
            comments.clear()


# region vulnerable
def vulnerable_render(comments):
    items = "".join(f"<li><b>{c['author']}</b>: {c['text']}</li>" for c in comments)
    return f"<h2>Guestbook</h2><ul>{items}</ul>"
# endregion


# region fixed
def fixed_render(comments):
    items = "".join(
        f"<li><b>{html.escape(c['author'])}</b>: {html.escape(c['text'])}</li>" for c in comments
    )
    return f"<h2>Guestbook</h2><ul>{items}</ul>"
# endregion


class CommentBody(BaseModel):
    author: str = Field(max_length=40)
    text: str = Field(max_length=500)


@router.get("/static/lab.js")
def serve_lab_js() -> Response:
    return Response(lab_js(LAB_ID), media_type="application/javascript; charset=utf-8")


@router.get("/{mode}/comments")
def list_comments(mode: Mode):
    with _lock:
        return {"comments": list(_comments[mode])}


@router.post("/{mode}/comments", status_code=201)
def add_comment(mode: Mode, body: CommentBody):
    comment = {"author": body.author, "text": body.text}
    with _lock:
        _comments[mode].append(comment)
        del _comments[mode][:-MAX_COMMENTS]
    return comment


@router.delete("/{mode}/comments")
def clear_comments(mode: Mode):
    with _lock:
        _comments[mode].clear()
    return {"cleared": True}


@router.get("/{mode}/page", response_class=HTMLResponse)
def page(mode: Mode, request: Request):
    render = vulnerable_render if mode == "vulnerable" else fixed_render
    with _lock:
        comments = list(_comments[mode])
        content = render(comments)
    if mode == "fixed" and any("<" in c["author"] + c["text"] for c in comments):
        mark_blocked(LAB_ID, request)  # stored markup was served as inert text

    headers = {"Content-Security-Policy": FIXED_CSP} if mode == "fixed" else {}
    return HTMLResponse(render_page(LAB_ID, mode, "Guestbook", content), headers=headers)


@router.get("/{mode}/beacon", status_code=204)
def beacon(mode: Mode, request: Request) -> Response:
    if mode == "vulnerable":
        mark_solved(LAB_ID, request)
    return Response(status_code=204)
