"""Regression: a status poll in flight during a reset must not resurrect a cleared exploit."""

import asyncio

import httpx

import main as labs_main
from app.config import Settings
from app.main import create_app


class SlowStatusTransport(httpx.AsyncBaseTransport):
    """Delivers the lab's answer to /status late, like a slow network would."""

    def __init__(self, delay: float) -> None:
        self.inner = httpx.ASGITransport(app=labs_main.app)
        self.delay = delay

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        response = await self.inner.handle_async_request(request)
        if request.url.path.endswith("/status"):
            await response.aread()
            await asyncio.sleep(self.delay)
        return response


def test_reset_during_status_poll_does_not_leave_a_stale_exploit(tmp_path):
    async def scenario() -> dict:
        app = create_app(Settings(progress_db=str(tmp_path / "p.db")), labs_transport=SlowStatusTransport(0.3))
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://api") as api:
            await api.post("/api/progress/reset")
            await api.get("/api/labs/xss/vulnerable/beacon")  # the learner "exploits" XSS

            poll = asyncio.create_task(api.get("/api/labs/xss/status"))
            await asyncio.sleep(0.1)  # the poll has read "solved" and is waiting for the slow answer
            await api.post("/api/progress/reset")
            await poll
            return (await api.get("/api/labs/xss/status")).json()

    final = asyncio.run(scenario())
    assert final["exploited"] is False and final["status"] == "not_started"
