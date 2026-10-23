import httpx
import pytest
from fastapi.testclient import TestClient

import main as labs_main  # the real lab service, served in-process (no network)
from app.config import Settings
from app.main import create_app


@pytest.fixture()
def api(tmp_path):
    settings = Settings(progress_db=str(tmp_path / "progress.db"))
    app = create_app(settings, labs_transport=httpx.ASGITransport(app=labs_main.app))
    with TestClient(app) as client:
        client.post("/api/progress/reset")
        yield client
        client.post("/api/progress/reset")


@pytest.fixture()
def offline_api(tmp_path):
    """Backend whose lab service is unreachable."""

    def refuse(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("lab service down", request=request)

    app = create_app(Settings(progress_db=str(tmp_path / "p.db")), labs_transport=httpx.MockTransport(refuse))
    with TestClient(app) as client:
        yield client
