import pytest

ALICE = {"Authorization": "Bearer alice-demo-token"}


def test_proxy_forwards_json_requests(api):
    r = api.get("/api/labs/idor/vulnerable/bookings/101", headers=ALICE)
    assert r.status_code == 200 and r.json()["owner"] == "alice"
    assert r.headers["content-type"].startswith("application/json")


def test_proxy_passes_upstream_status_codes(api):
    assert api.get("/api/labs/idor/fixed/bookings/102", headers=ALICE).status_code == 403
    assert api.get("/api/labs/idor/fixed/bookings/101").status_code == 401


def test_html_from_vulnerable_lab_is_never_served_as_html(api):
    """A reflected XSS payload must not execute on the dashboard origin."""
    r = api.get("/api/labs/xss/vulnerable/search", params={"q": "<img src=x onerror=alert(1)>"})
    assert "<img src=x onerror=alert(1)>" in r.text  # students can still inspect the raw body
    assert r.headers["content-type"].startswith("text/plain")
    assert r.headers["x-upstream-content-type"].startswith("text/html")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert "sandbox" in r.headers["content-security-policy"]


def test_upstream_csp_is_reported_not_applied(api):
    r = api.get("/api/labs/xss/fixed/search", params={"q": "x"})
    assert "script-src 'self'" in r.headers["x-upstream-content-security-policy"]
    assert r.headers["content-security-policy"] == "default-src 'none'; sandbox"


@pytest.mark.parametrize("path", ["..%2f..%2freset-all", "a%2f..%2f..%2freset-all", "a//b", "..%5cx", "%2e%2e/x"])
def test_path_tricks_are_rejected(api, path):
    # %2f / %2e are decoded by the framework, so the proxy sees real ".." segments.
    r = api.post(f"/api/labs/sql-injection/vulnerable/{path}")
    assert r.status_code in (400, 404)


@pytest.mark.parametrize("path", ["../../reset-all", "a/../b", "./products", "x\\y", "a//b", "bad\x00"])
def test_safe_path_rejects_traversal(path):
    from fastapi import HTTPException

    from app.routes.proxy import safe_path

    with pytest.raises(HTTPException):
        safe_path(path)


def test_safe_path_encodes_and_keeps_normal_paths():
    from app.routes.proxy import safe_path

    assert safe_path("bookings/101") == "bookings/101"
    assert safe_path("a b?c") == "a%20b%3Fc"


@pytest.mark.parametrize("url", ["/api/labs/unknown/vulnerable/x", "/api/labs/not-a-lab/vulnerable/x", "/api/labs/xss/admin/search"])
def test_unknown_lab_or_mode_is_rejected(api, url):
    assert api.get(url).status_code == 404


def test_internal_lab_endpoints_are_not_reachable_through_the_proxy(api):
    assert api.get("/api/labs/xss/vulnerable/status").status_code == 404  # not under /<lab>/<mode>/
    assert api.post("/api/labs/xss/fixed/reset-all").status_code in (404, 405)


def test_cookies_and_unlisted_headers_are_not_forwarded(api):
    r = api.get(
        "/api/labs/idor/vulnerable/bookings/101",
        headers={**ALICE, "Cookie": "a=b", "X-Websec-Verifier": "1", "X-Forwarded-For": "1.2.3.4"},
    )
    assert r.status_code == 200 and "set-cookie" not in r.headers
    # The spoofed verifier header was dropped, so this cross-user read must count as a real exploit.
    api.get("/api/labs/idor/vulnerable/bookings/102", headers={**ALICE, "X-Websec-Verifier": "1"})
    assert api.get("/api/labs/idor/status").json()["exploited"] is True


def test_oversized_bodies_are_rejected(api):
    r = api.post("/api/labs/broken-auth/vulnerable/login", content=b"x" * (64 * 1024 + 1))
    assert r.status_code == 413


def test_retry_after_is_forwarded(api):
    for _ in range(5):
        api.post("/api/labs/broken-auth/fixed/login", json={"username": "alice", "password": "bad"})
    r = api.post("/api/labs/broken-auth/fixed/login", json={"username": "alice", "password": "bad"})
    assert r.status_code == 429 and r.headers["retry-after"] == "30"


def test_api_responses_have_security_headers(api):
    r = api.get("/api/labs")
    assert r.headers["x-content-type-options"] == "nosniff" and r.headers["cache-control"] == "no-store"


def test_all_upstream_headers_are_reported_but_not_applied(api):
    import json

    r = api.get("/api/labs/security-misconfiguration/vulnerable/ping")
    upstream = json.loads(r.headers["x-upstream-headers"])
    assert "x-powered-by" in upstream and "x-content-type-options" not in upstream
    assert "x-powered-by" not in r.headers  # reported, never applied to the dashboard's response
    fixed = json.loads(api.get("/api/labs/security-misconfiguration/fixed/ping").headers["x-upstream-headers"])
    assert fixed["x-frame-options"] == "DENY" and "x-powered-by" not in fixed
