"""Path Traversal lab: document viewer (OWASP A01:2025 Broken Access Control).

SAFETY: the files below live in an in-memory dictionary keyed by absolute POSIX
paths. The path logic (join, normalise, prefix check) is identical to what a real
file server does, but no real file on the learner's machine is ever opened.
"""

from __future__ import annotations

import posixpath
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Request

from common import Mode, mark_blocked, mark_solved

LAB_ID = "path-traversal"
SOURCE_FILE = Path(__file__)

router = APIRouter(prefix=f"/{LAB_ID}", tags=[LAB_ID])

DOCS_ROOT = "/srv/app/public/docs"

FILES = {
    "/srv/app/public/docs/welcome.txt": "Welcome to the documentation portal.",
    "/srv/app/public/docs/faq.txt": "Q: Is this real? A: It is a training lab.",
    "/srv/app/public/docs/guides/start.txt": "Getting started: open a document by name.",
    "/srv/app/config/app.env": "DATABASE_URL=postgres://shop:Sup3rS3cret@db.internal/shop\nSECRET_KEY=dev-secret-key-123",
    "/etc/passwd": "root:x:0:0:root:/root:/bin/sh\nlab:x:1000:1000::/home/lab:/bin/sh",
}


def reset() -> None:
    """The file table is constant, nothing to reset."""


# region vulnerable
def vulnerable_read(name):
    path = posixpath.normpath(posixpath.join(DOCS_ROOT, name))
    return path, FILES.get(path)
# endregion


# region fixed
def fixed_read(name):
    path = posixpath.normpath(posixpath.join(DOCS_ROOT, name))
    if "\x00" in name or posixpath.commonpath([path, DOCS_ROOT]) != DOCS_ROOT:
        raise HTTPException(403, "Access outside the documents folder is not allowed")
    return path, FILES.get(path)
# endregion


@router.get("/{mode}/files")
def read_file(mode: Mode, request: Request, name: str = Query(..., max_length=300)):
    try:
        path, content = (vulnerable_read if mode == "vulnerable" else fixed_read)(name)
    except HTTPException as exc:
        if mode == "fixed" and exc.status_code == 403:
            mark_blocked(LAB_ID, request)  # an escape from the documents folder was refused
        raise
    if content is None:
        raise HTTPException(404, "File not found")
    if mode == "vulnerable" and not path.startswith(DOCS_ROOT + "/"):
        mark_solved(LAB_ID, request)
    return {"name": name, "resolved": path, "content": content}
