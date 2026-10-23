"""File Upload lab: avatars (OWASP A06:2025 Insecure Design).

Uploaded files are kept in memory and served back from a separate origin; nothing is
ever written to disk or executed on the server. The risk demonstrated is *active
content*: an HTML/SVG file served with an attacker-chosen Content-Type runs script
in the lab origin (the dashboard previews it in a sandboxed iframe).
"""

from __future__ import annotations

import posixpath
import secrets
import threading
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, Response, UploadFile

from common import Mode, mark_blocked, mark_solved

LAB_ID = "file-upload"
SOURCE_FILE = Path(__file__)

router = APIRouter(prefix=f"/{LAB_ID}", tags=[LAB_ID])

MAX_BYTES = 32 * 1024
MAX_FILES = 40
ACTIVE_TYPES = ("text/html", "image/svg+xml", "application/xhtml+xml", "text/javascript", "application/javascript")

_lock = threading.Lock()
_files: dict[str, dict[str, tuple[str, bytes]]] = {"vulnerable": {}, "fixed": {}}


def reset() -> None:
    with _lock:
        for store in _files.values():
            store.clear()


# region vulnerable
def vulnerable_store(store, filename, content_type, data):
    store[filename] = (content_type, data)
    return filename
# endregion


# region fixed
ALLOWED = {".png": (b"\x89PNG\r\n\x1a\n", "image/png"), ".jpg": (b"\xff\xd8\xff", "image/jpeg")}


def fixed_store(store, filename, content_type, data):
    signature, media_type = ALLOWED.get(posixpath.splitext(filename.lower())[1], (None, None))
    if signature is None:
        raise HTTPException(415, "Only .png and .jpg images are allowed")
    if not data.startswith(signature):
        raise HTTPException(415, "File content does not match its extension")
    name = secrets.token_hex(8) + posixpath.splitext(filename.lower())[1]
    store[name] = (media_type, data)
    return name
# endregion


@router.post("/{mode}/upload", status_code=201)
async def upload(mode: Mode, file: UploadFile, request: Request):
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, f"File too large (max {MAX_BYTES} bytes)")
    store = _files[mode]
    with _lock:
        try:
            saved = (vulnerable_store if mode == "vulnerable" else fixed_store)(
                store, file.filename or "upload", file.content_type or "application/octet-stream", data
            )
        except HTTPException as exc:
            if mode == "fixed" and exc.status_code == 415:
                mark_blocked(LAB_ID, request)  # a non-image or disguised file was refused
            raise
        while len(store) > MAX_FILES:
            store.pop(next(iter(store)))
    return {"filename": saved, "size": len(data), "url": f"/{LAB_ID}/{mode}/uploads/{saved}"}


@router.get("/{mode}/uploads/{filename:path}")
def serve(mode: Mode, filename: str, request: Request) -> Response:
    with _lock:
        entry = _files[mode].get(filename)
    if entry is None:
        raise HTTPException(404, "File not found")
    content_type, data = entry
    headers: dict[str, str] = {}
    if mode == "fixed":
        headers = {
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": "attachment",
            "Content-Security-Policy": "default-src 'none'; sandbox",
        }
    elif content_type.split(";")[0].strip().lower() in ACTIVE_TYPES:
        mark_solved(LAB_ID, request)  # active content is served as active content
    return Response(data, media_type=content_type, headers=headers)


@router.get("/{mode}/files")
def list_files(mode: Mode):
    with _lock:
        return {"files": [{"filename": name, "content_type": ct, "size": len(data)} for name, (ct, data) in _files[mode].items()]}
