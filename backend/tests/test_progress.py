def alice_reads_bob(api):
    """Exploit in vulnerable mode, then repeat the same request against the fixed mode."""
    for mode in ("vulnerable", "fixed"):
        api.get(f"/api/labs/idor/{mode}/bookings/102", headers={"Authorization": "Bearer alice-demo-token"})


def test_fresh_progress_is_empty(api):
    p = api.get("/api/progress").json()
    assert (p["labs_available"], p["labs_planned"], p["completed"], p["checks_run"]) == (12, 12, 0, 0)
    assert not any(a["unlocked"] for a in p["achievements"])
    assert p["history"] == []


def test_progress_tracks_exploits_hints_and_checks(api):
    alice_reads_bob(api)
    api.post("/api/labs/idor/hints/1")
    verify = api.post("/api/labs/idor/verify").json()
    p = api.get("/api/progress").json()
    assert (p["completed"], p["exploited"], p["hints_used"]) == (1, 1, 1)
    assert p["checks_run"] == verify["total"] and p["checks_passed"] == verify["passed"]
    unlocked = {a["id"] for a in p["achievements"] if a["unlocked"]}
    assert unlocked == {"first-blood", "patched"}  # a hint was used, so no "no-hints"
    kinds = [e["kind"] for e in p["history"]]
    assert {"exploit_detected", "defense_observed", "hint_revealed", "verification", "fix_verified", "completed"} <= set(kinds)
    assert p["history"][0]["lab_title"]


def test_unassisted_achievement(api):
    alice_reads_bob(api)
    api.post("/api/labs/idor/verify")
    unlocked = {a["id"] for a in api.get("/api/progress").json()["achievements"] if a["unlocked"]}
    assert "no-hints" in unlocked


def test_reset_clears_progress_and_lab_challenge_state(api):
    alice_reads_bob(api)
    api.post("/api/labs/idor/verify")
    assert api.post("/api/progress/reset").json() == {"reset": True}
    p = api.get("/api/progress").json()
    assert p["completed"] == 0 and p["exploited"] == 0 and p["history"] == []
    assert api.get("/api/labs/idor/status").json()["status"] == "not_started"


def test_progress_survives_a_new_app_instance(tmp_path):
    from app.store import Store

    path = str(tmp_path / "persist.db")
    Store(path).mark_exploited("xss")
    assert Store(path).progress("xss")["status"] == "vulnerability_found"


def test_migration_withdraws_completions_made_under_the_old_rule(tmp_path):
    import sqlite3

    from app.store import Store

    path = str(tmp_path / "old.db")
    with sqlite3.connect(path) as db:  # a v1.0.x database: no defended_at column
        db.execute(
            "CREATE TABLE lab_progress (lab_id TEXT PRIMARY KEY, exploited_at TEXT, fix_verified_at TEXT, completed_at TEXT, "
            "verification_runs INTEGER NOT NULL DEFAULT 0, checks_run INTEGER NOT NULL DEFAULT 0, checks_passed INTEGER NOT NULL DEFAULT 0)"
        )
        db.execute("INSERT INTO lab_progress (lab_id, exploited_at, fix_verified_at, completed_at) VALUES ('idor', 'x', 'x', 'x')")
    progress = Store(path).progress("idor")
    assert progress["exploited"] and progress["fix_verified"]
    assert not progress["defended"] and not progress["completed"]
    Store(path).mark_defended("idor")
    assert Store(path).progress("idor")["completed"]
