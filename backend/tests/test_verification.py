import pytest

LABS = (
    "sql-injection", "xss", "stored-xss", "idor", "broken-access-control",
    "broken-auth", "path-traversal", "security-misconfiguration",
    "csrf", "jwt", "file-upload", "race-condition",
)
EXPLOIT = {
    "sql-injection": lambda api: api.get("/api/labs/sql-injection/vulnerable/products", params={"name": "' OR 1=1 --"}),
    "xss": lambda api: api.get("/api/labs/xss/vulnerable/beacon"),
    "idor": lambda api: api.get(
        "/api/labs/idor/vulnerable/bookings/102", headers={"Authorization": "Bearer alice-demo-token"}
    ),
}


@pytest.mark.parametrize("lab_id", LABS)
def test_verification_proves_both_modes(api, lab_id):
    result = api.post(f"/api/labs/{lab_id}/verify").json()
    failed = [c for c in result["checks"] if not c["passed"]]
    assert not failed, failed
    assert result["vulnerability_confirmed"] and result["fix_confirmed"]
    kinds = {c["kind"] for c in result["checks"]}
    assert {"functional", "attack", "defense"} <= kinds
    assert result["passed"] == result["total"] > 0


@pytest.mark.parametrize("lab_id", LABS)
def test_verification_alone_does_not_complete_the_lab(api, lab_id):
    """Reference exploits must not count as the learner solving the challenge."""
    result = api.post(f"/api/labs/{lab_id}/verify").json()
    assert result["exploited_by_you"] is False and result["completed"] is False
    assert api.get(f"/api/labs/{lab_id}/status").json()["status"] == "not_started"


def test_lab_completes_after_own_exploit_plus_verified_fix(api):
    EXPLOIT["sql-injection"](api)
    assert api.get("/api/labs/sql-injection/status").json()["status"] == "vulnerability_found"
    result = api.post("/api/labs/sql-injection/verify").json()
    assert result["completed"] and result["completed_now"]
    assert api.post("/api/labs/sql-injection/verify").json()["completed_now"] is False


def test_exploit_after_verification_also_completes(api):
    api.post("/api/labs/idor/verify")
    assert api.get("/api/labs/idor/status").json()["completed"] is False
    EXPLOIT["idor"](api)
    assert api.get("/api/labs/idor/status").json()["completed"] is True


def test_exploiting_fixed_mode_does_not_count(api):
    api.get("/api/labs/sql-injection/fixed/products", params={"name": "' OR 1=1 --"})
    api.get(
        "/api/labs/idor/fixed/bookings/102", headers={"Authorization": "Bearer alice-demo-token"}
    )
    assert api.get("/api/labs/sql-injection/status").json()["exploited"] is False
    assert api.get("/api/labs/idor/status").json()["exploited"] is False


def test_verification_results_are_localized(api):
    en = api.post("/api/labs/idor/verify", params={"lang": "en"}).json()["checks"][0]["title"]
    ru = api.post("/api/labs/idor/verify", params={"lang": "ru"}).json()["checks"][0]["title"]
    assert en != ru


def test_broken_auth_verification_leaves_lab_state_clean(api):
    api.post("/api/labs/broken-auth/verify")
    login = api.post("/api/labs/broken-auth/fixed/login", json={"username": "alice", "password": "sunshine"})
    assert login.status_code == 200  # no leftover lockout


def test_a_broken_lab_would_fail_verification(api, monkeypatch):
    """Sanity check of the verifier itself: if the fix regressed, verification must say so."""
    import idor.router as idor

    monkeypatch.setattr(idor, "fixed_get_booking", idor.vulnerable_get_booking)
    result = api.post("/api/labs/idor/verify").json()
    assert result["fix_confirmed"] is False and result["vulnerability_confirmed"] is True
    assert any(c["mode"] == "fixed" and c["kind"] == "defense" and not c["passed"] for c in result["checks"])
