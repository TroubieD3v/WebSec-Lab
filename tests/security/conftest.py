import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture()
def labs():
    with TestClient(app) as client:
        client.post("/reset-all")
        yield client
        client.post("/reset-all")
