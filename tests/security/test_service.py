def test_health_and_status(labs):
    assert labs.get("/health").json()["status"] == "ok"
    assert labs.get("/nope/status").status_code == 404


def test_source_regions_are_extracted_from_real_code(labs):
    for lab in ("sql-injection", "xss", "idor", "broken-auth", "stored-xss", "broken-access-control", "security-misconfiguration", "path-traversal"):
        data = labs.get(f"/{lab}/source").json()
        assert data["vulnerable"].strip() and data["fixed"].strip()
        assert data["vulnerable"] != data["fixed"]


def test_docs_endpoints_are_disabled(labs):
    assert labs.get("/docs").status_code == 404
    assert labs.get("/openapi.json").status_code == 404
