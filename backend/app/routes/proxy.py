"""Attack Playground proxy: /api/labs/<lab>/<mode>/<path> -> lab service.

The lab service is intentionally vulnerable, so this proxy is a trust boundary:
  * only known lab ids and the two modes are reachable, never arbitrary hosts or
    internal lab endpoints (status/source/reset);
  * the target host is fixed, redirects are not followed, path tricks are rejected;
  * only a few request headers are forwarded and cookies never come back;
  * upstream HTML is returned as text/plain inside a CSP sandbox, so a reflected
    XSS payload can never execute on the dashboard's origin.
"""

from __future__ import annotations

import json
import time
from urllib.parse import quote

import httpx
from fastapi import APIRouter, HTTPException, Request, Response

from ..catalog import CATALOG, MODES

router = APIRouter(tags=["playground"])

FORWARD_REQUEST_HEADERS = ("authorization", "content-type", "accept")
FORWARD_RESPONSE_HEADERS = ("retry-after", "www-authenticate")
METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]


def safe_path(path: str) -> str:
    segments = path.split("/")
    if any(s in {".", ".."} or "\\" in s or "\x00" in s for s in segments) or "//" in path:
        raise HTTPException(400, "Invalid path")
    return quote(path, safe="/")


@router.api_route("/labs/{lab_id}/{mode}/{path:path}", methods=METHODS)
async def proxy(lab_id: str, mode: str, path: str, request: Request) -> Response:
    lab = CATALOG.get(lab_id)
    if lab is None or not lab.available or mode not in MODES:
        raise HTTPException(404, "Unknown lab or mode")
    settings = request.app.state.settings

    body = await request.body()
    if len(body) > settings.max_request_body:
        raise HTTPException(413, "Request body too large")

    headers = {k: v for k, v in request.headers.items() if k.lower() in FORWARD_REQUEST_HEADERS}
    target = f"/{lab_id}/{mode}/{safe_path(path)}"
    started = time.perf_counter()
    try:
        async with request.app.state.labs.http() as http:
            upstream = await http.request(
                request.method, target, params=request.query_params.multi_items(), content=body, headers=headers
            )
    except httpx.HTTPError:
        raise HTTPException(502, "Lab service is unavailable") from None

    content = upstream.content[: settings.max_response_body]
    upstream_type = upstream.headers.get("content-type", "")
    is_json = upstream_type.startswith("application/json")
    out_headers = {
        "Content-Type": upstream_type if is_json else "text/plain; charset=utf-8",
        "X-Upstream-Content-Type": upstream_type,
        # Every upstream header is reported for inspection (e.g. missing security headers),
        # but none of them is applied to this response.
        "X-Upstream-Headers": json.dumps({k.lower(): v for k, v in upstream.headers.items()})[:8192],
        "X-Upstream-Time-Ms": f"{(time.perf_counter() - started) * 1000:.0f}",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'none'; sandbox",
    }
    for name in FORWARD_RESPONSE_HEADERS:
        if name in upstream.headers:
            out_headers[name] = upstream.headers[name]
    if "content-security-policy" in upstream.headers:
        out_headers["X-Upstream-Content-Security-Policy"] = upstream.headers["content-security-policy"]
    return Response(content=content, status_code=upstream.status_code, headers=out_headers)
