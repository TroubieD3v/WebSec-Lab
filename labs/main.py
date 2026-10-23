"""Entry point of the intentionally vulnerable lab service.

Run from the `labs/` directory:  uvicorn main:app --port 8081

This service must only ever be reachable from localhost / the private Docker
network. The control plane (`backend/`) talks to it; learners reach the XSS
pages directly because they have to live on a separate origin.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

import access_control.router as access_control
import authentication.router as authentication
import csrf.router as csrf
import file_upload.router as file_upload
import idor.router as idor
import jwt_misconfig.router as jwt_misconfig
import path_traversal.router as path_traversal
import race_condition.router as race_condition
import security_misconfig.router as security_misconfig
import sql_injection.router as sql_injection
import stored_xss.router as stored_xss
import xss.router as xss
from common import clear_solved, is_blocked, is_solved, source_payload

MODULES = {
    m.LAB_ID: m
    for m in (
        sql_injection,
        xss,
        idor,
        authentication,
        stored_xss,
        access_control,
        security_misconfig,
        path_traversal,
        csrf,
        jwt_misconfig,
        file_upload,
        race_condition,
    )
}

# The lab that demonstrates *missing* security headers must not get them from this middleware.
UNHARDENED_PREFIX = f"/{security_misconfig.LAB_ID}/vulnerable"


app = FastAPI(
    title="WebSec Lab - vulnerable labs",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
for module in MODULES.values():
    app.include_router(module.router)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith(UNHARDENED_PREFIX):
        return response
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Cache-Control", "no-store")
    return response


def _lab(lab_id: str):
    module = MODULES.get(lab_id)
    if module is None:
        raise HTTPException(404, "Unknown lab")
    return module


@app.get("/health")
def health():
    return {"status": "ok", "labs": sorted(MODULES)}


@app.get("/{lab_id}/status")
def status(lab_id: str):
    _lab(lab_id)
    return {"lab": lab_id, "solved": is_solved(lab_id), "blocked": is_blocked(lab_id)}


@app.get("/{lab_id}/source")
def source(lab_id: str):
    return source_payload(_lab(lab_id).SOURCE_FILE)


@app.post("/{lab_id}/reset")
def reset(lab_id: str):
    _lab(lab_id).reset()
    return {"lab": lab_id, "reset": True}


@app.post("/reset-all")
def reset_all():
    for module in MODULES.values():
        module.reset()
    clear_solved()
    return JSONResponse({"reset": True})
