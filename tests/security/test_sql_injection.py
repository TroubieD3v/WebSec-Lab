BYPASS = "' OR 1=1 --"
UNION = "' UNION SELECT id, username, secret, 0 FROM users --"


def search(labs, mode, name):
    return labs.get(f"/sql-injection/{mode}/products", params={"name": name})


def test_normal_search_works_in_both_modes(labs):
    for mode in ("vulnerable", "fixed"):
        data = search(labs, mode, "Laptop Pro").json()
        assert data["count"] == 1 and data["rows"][0]["name"] == "Laptop Pro"


def test_vulnerable_bypass_returns_unreleased_products(labs):
    names = {r["name"] for r in search(labs, "vulnerable", BYPASS).json()["rows"]}
    assert {"Prototype X-9000", "Staff Discount Card"} <= names


def test_fixed_bypass_returns_nothing(labs):
    assert search(labs, "fixed", BYPASS).json()["count"] == 0


def test_vulnerable_union_leaks_user_secrets(labs):
    rows = search(labs, "vulnerable", UNION).json()["rows"]
    assert "Adm1n-S3cret!" in {r["category"] for r in rows}


def test_fixed_union_returns_nothing(labs):
    assert search(labs, "fixed", UNION).json()["count"] == 0


def test_vulnerable_leaks_sql_errors(labs):
    response = search(labs, "vulnerable", "'")
    assert response.status_code == 500 and "error" in response.json()


def test_challenge_flag_set_only_by_real_exploit(labs):
    assert labs.get("/sql-injection/status").json()["solved"] is False
    search(labs, "fixed", BYPASS)
    labs.get(
        "/sql-injection/vulnerable/products",
        params={"name": BYPASS},
        headers={"x-websec-verifier": "1"},
    )
    assert labs.get("/sql-injection/status").json()["solved"] is False
    search(labs, "vulnerable", BYPASS)
    assert labs.get("/sql-injection/status").json()["solved"] is True


def test_injection_cannot_modify_data(labs):
    search(labs, "vulnerable", "'; DROP TABLE products; --")
    search(labs, "vulnerable", "' UNION SELECT 1,2,3,load_extension('x') --")
    assert search(labs, "vulnerable", "Laptop Pro").json()["count"] == 1


def test_runaway_query_is_aborted(labs):
    payload = "' UNION WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c) SELECT x,x,x,x FROM c --"
    response = search(labs, "vulnerable", payload)
    assert response.status_code in (400, 500)
