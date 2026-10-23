LAB = "security-misconfiguration"


def get(labs, mode, path):
    return labs.get(f"/{LAB}/{mode}{path}")


def test_valid_order_and_ping_work_in_both_modes(labs):
    for mode in ("vulnerable", "fixed"):
        assert get(labs, mode, "/orders/1001").json()["item"] == "Wireless Mouse"
        assert get(labs, mode, "/ping").json() == {"status": "ok"}
        assert get(labs, mode, "/orders/9999").status_code == 404


def test_vulnerable_exposes_debug_config_with_secrets(labs):
    response = get(labs, "vulnerable", "/debug/config")
    assert response.status_code == 200
    assert response.json()["secret_key"] and "Sup3rS3cret" in response.json()["database_url"]


def test_fixed_hides_debug_endpoint(labs):
    response = get(labs, "fixed", "/debug/config")
    assert response.status_code == 404 and "secret" not in response.text


def test_vulnerable_errors_include_stack_traces(labs):
    response = get(labs, "vulnerable", "/orders/abc")
    assert response.status_code == 500
    assert "Traceback" in response.json()["trace"] and "invalid literal" in response.json()["error"]


def test_fixed_errors_are_generic_with_an_incident_id(labs):
    response = get(labs, "fixed", "/orders/abc")
    body = response.json()
    assert response.status_code == 500 and body["error"] == "Internal server error"
    assert len(body["incident"]) == 8
    assert "Traceback" not in response.text and "invalid literal" not in response.text


def test_vulnerable_has_banners_and_no_security_headers(labs):
    headers = get(labs, "vulnerable", "/ping").headers
    assert "x-powered-by" in headers and "x-app-version" in headers
    for name in ("x-content-type-options", "x-frame-options", "content-security-policy", "referrer-policy"):
        assert name not in headers


def test_fixed_sets_security_headers_and_no_banners(labs):
    headers = get(labs, "fixed", "/ping").headers
    assert headers["x-content-type-options"] == "nosniff" and headers["x-frame-options"] == "DENY"
    assert "frame-ancestors 'none'" in headers["content-security-policy"]
    assert "x-powered-by" not in headers and "x-app-version" not in headers


def test_challenge_solved_by_debug_endpoint_or_trace(labs):
    get(labs, "fixed", "/debug/config")
    assert labs.get(f"/{LAB}/status").json()["solved"] is False
    get(labs, "vulnerable", "/orders/abc")
    assert labs.get(f"/{LAB}/status").json()["solved"] is True
    labs.post("/reset-all")
    get(labs, "vulnerable", "/debug/config")
    assert labs.get(f"/{LAB}/status").json()["solved"] is True
