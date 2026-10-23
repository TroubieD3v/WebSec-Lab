"""WebSec Lab control plane.

Owns the catalog, progress, hints, code diff and automatic verification. It never
contains vulnerable code: that lives in the isolated `labs` service.

Run:  uvicorn app.main:create_app --factory --port 8000
"""

from __future__ import annotations

import asyncio

import httpx
from fastapi import FastAPI, Request

from . import __version__
from .config import Settings
from .routes import labs, progress, proxy
from .services.labs_client import LabsClient
from .store import Store


def create_app(settings: Settings | None = None, labs_transport: httpx.AsyncBaseTransport | None = None) -> FastAPI:
    settings = settings or Settings()
    app = FastAPI(title="WebSec Lab API", version=__version__, docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)
    app.state.settings = settings
    app.state.store = Store(settings.progress_db)
    app.state.labs = LabsClient(settings.labs_url, settings.labs_timeout, labs_transport)
    app.state.progress_lock = asyncio.Lock()  # serialises exploit sync and progress reset

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Cache-Control", "no-store")
        return response

    # Order matters: concrete /labs/{id}/... routes must be matched before the proxy.
    app.include_router(progress.router, prefix="/api")
    app.include_router(labs.router, prefix="/api")
    app.include_router(proxy.router, prefix="/api")
    return app
