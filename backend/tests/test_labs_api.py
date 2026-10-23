LABS = (
    "sql-injection", "xss", "stored-xss", "idor", "broken-access-control",
    "broken-auth", "path-traversal", "security-misconfiguration",
    "csrf", "jwt", "file-upload", "race-condition",
)


def test_catalog_lists_available_and_planned_labs(api):
    data = api.get("/api/labs").json()
    assert data["labs_online"] is True
    by_id = {lab["id"]: lab for lab in data["labs"]}
    assert len(by_id) == 12
    assert all(by_id[i]["available"] for i in LABS)
    assert not [i for i, lab in by_id.items() if not lab["available"]]
    assert by_id["sql-injection"]["owasp"] == "A05:2025"
    assert by_id["idor"]["owasp"] == "A01:2025"
    assert by_id["broken-auth"]["owasp"] == "A07:2025"


def test_content_is_localized_with_english_fallback(api):
    en = api.get("/api/labs/idor", params={"lang": "en"}).json()
    ru = api.get("/api/labs/idor", params={"lang": "ru"}).json()
    assert en["title"] != ru["title"] and "бронирован" in ru["title"].lower()
    assert api.get("/api/labs/idor", params={"lang": "xx"}).json()["title"] == en["title"]


def test_every_lab_has_complete_teaching_content(api):
    for lab_id in LABS:
        d = api.get(f"/api/labs/{lab_id}").json()
        assert d["task"] and d["root_cause"] and d["fix"] and d["hint_count"] == 3
        assert d["presets"] and d["references"] and d["cwe"]


def test_every_catalog_lab_is_playable_and_unknown_ones_are_not(api):
    assert api.get("/api/labs/csrf").status_code == 200
    assert api.post("/api/labs/not-a-lab/verify").status_code == 404


def test_unknown_lab_is_404(api):
    assert api.get("/api/labs/nope").status_code == 404


def test_hints_are_revealed_one_by_one_and_counted(api):
    assert api.get("/api/labs/xss").json()["revealed_hints"] == {}
    assert api.post("/api/labs/xss/hints/2").json()["hints_used"] == 1
    api.post("/api/labs/xss/hints/2")  # idempotent
    detail = api.get("/api/labs/xss").json()
    assert list(detail["revealed_hints"]) == ["2"] and detail["progress"]["hints_used"] == 1
    assert api.post("/api/labs/xss/hints/9").status_code == 404


def test_code_diff_comes_from_the_running_lab_code(api):
    for lab_id in LABS:
        code = api.get(f"/api/labs/{lab_id}/code").json()
        assert code["vulnerable"] != code["fixed"]
        assert any(r["left"] and r["left"]["kind"] == "del" for r in code["rows"])
        assert any(r["right"] and r["right"]["kind"] == "add" for r in code["rows"])
        assert code["unified"].startswith("--- vulnerable")
    sqli = api.get("/api/labs/sql-injection/code").json()
    assert "f\"SELECT" in sqli["vulnerable"] and "?" in sqli["fixed"]


def test_labs_offline_is_reported_not_crashing(offline_api):
    data = offline_api.get("/api/labs").json()
    assert data["labs_online"] is False and len(data["labs"]) == 12
    assert offline_api.get("/api/health").json()["labs_online"] is False
    assert offline_api.get("/api/labs/xss/code").status_code == 502
    assert offline_api.post("/api/labs/xss/verify").status_code == 502
    assert offline_api.get("/api/labs/xss/vulnerable/search").status_code == 502


def test_every_lab_and_every_check_is_fully_translated(api):
    """A missing Russian string would silently fall back to English; catch it for all labs."""
    import re

    cyrillic = re.compile("[а-яё]", re.I)
    for lab_id in LABS:
        en = api.get(f"/api/labs/{lab_id}", params={"lang": "en"}).json()
        ru = api.get(f"/api/labs/{lab_id}", params={"lang": "ru"}).json()
        for field in ("title", "summary", "task", "root_cause", "fix"):
            assert cyrillic.search(ru[field]) and ru[field] != en[field], (lab_id, field)
        for level in range(1, ru["hint_count"] + 1):
            hint = api.post(f"/api/labs/{lab_id}/hints/{level}", params={"lang": "ru"}).json()["text"]
            assert cyrillic.search(hint), (lab_id, "hint", level)
        assert all(cyrillic.search(p["label"]) or p["label"] == e["label"] for p, e in zip(ru["presets"], en["presets"]))
        checks = api.post(f"/api/labs/{lab_id}/verify", params={"lang": "ru"}).json()["checks"]
        assert all(cyrillic.search(c["title"]) for c in checks), (lab_id, [c["title"] for c in checks if not cyrillic.search(c["title"])])
