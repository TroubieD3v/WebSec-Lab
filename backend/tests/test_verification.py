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


REPEAT_IN_FIXED = {
    "sql-injection": lambda api: api.get("/api/labs/sql-injection/fixed/products", params={"name": "' OR 1=1 --"}),
    "idor": lambda api: api.get(
        "/api/labs/idor/fixed/bookings/102", headers={"Authorization": "Bearer alice-demo-token"}
    ),
}


def test_lab_needs_exploit_then_blocked_repeat_then_verification(api):
    EXPLOIT["sql-injection"](api)
    assert api.get("/api/labs/sql-injection/status").json()["status"] == "vulnerability_found"
    result = api.post("/api/labs/sql-injection/verify").json()
    assert result["exploited_by_you"] and not result["defended_by_you"]
    assert result["completed"] is False  # verification alone must not stand in for trying the fixed mode

    REPEAT_IN_FIXED["sql-injection"](api)
    progress = api.get("/api/labs/sql-injection/status").json()
    assert progress["defended"] and progress["completed"]
    assert api.post("/api/labs/sql-injection/verify").json()["completed_now"] is False


def test_lab_completes_in_any_order_once_all_three_steps_happened(api):
    REPEAT_IN_FIXED["sql-injection"](api)
    api.post("/api/labs/sql-injection/verify")
    assert api.get("/api/labs/sql-injection/status").json()["completed"] is False
    EXPLOIT["sql-injection"](api)
    assert api.get("/api/labs/sql-injection/status").json()["completed"] is True


def test_normal_use_of_the_fixed_mode_is_not_a_blocked_attack(api):
    api.get("/api/labs/sql-injection/fixed/products", params={"name": "Laptop Pro"})
    api.get("/api/labs/idor/fixed/bookings/101", headers={"Authorization": "Bearer alice-demo-token"})
    assert api.get("/api/labs/sql-injection/status").json()["defended"] is False
    assert api.get("/api/labs/idor/status").json()["defended"] is False


def test_reference_attacks_do_not_count_as_the_learner_trying_the_fix(api):
    for lab_id in LABS:
        api.post(f"/api/labs/{lab_id}/verify")
        assert api.get(f"/api/labs/{lab_id}/status").json()["defended"] is False, lab_id


def test_exploit_after_verification_also_completes(api):
    api.post("/api/labs/idor/verify")
    EXPLOIT["idor"](api)
    assert api.get("/api/labs/idor/status").json()["completed"] is False
    REPEAT_IN_FIXED["idor"](api)
    assert api.get("/api/labs/idor/status").json()["completed"] is True


def test_exploiting_fixed_mode_does_not_count(api):
    api.get("/api/labs/sql-injection/fixed/products", params={"name": "' OR 1=1 --"})
    api.get(
        "/api/labs/idor/fixed/bookings/102", headers={"Authorization": "Bearer alice-demo-token"}
    )
    for lab_id in ("sql-injection", "idor"):
        status = api.get(f"/api/labs/{lab_id}/status").json()
        assert status["exploited"] is False and status["defended"] is True


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
