"""Thin client for the (untrusted, intentionally vulnerable) lab service."""

from __future__ import annotations

import httpx


class LabsClient:
    def __init__(self, base_url: str, timeout: float = 5.0, transport: httpx.AsyncBaseTransport | None = None):
        self.base_url = base_url
        self.timeout = timeout
        self.transport = transport

    def http(self, timeout: float | None = None) -> httpx.AsyncClient:
        """A fresh client; never follows redirects so the target host cannot change."""
        return httpx.AsyncClient(
            base_url=self.base_url,
            timeout=timeout or self.timeout,
            transport=self.transport,
            follow_redirects=False,
        )
