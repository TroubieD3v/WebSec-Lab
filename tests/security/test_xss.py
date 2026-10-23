PAYLOAD = "<img src=x onerror=alert(1)>"


def search(labs, mode, q):
    return labs.get(f"/xss/{mode}/search", params={"q": q})


def test_plain_text_is_reflected_in_both_modes(labs):
    for mode in ("vulnerable", "fixed"):
        response = search(labs, mode, "hello")
        assert "hello" in response.text
        assert response.headers["content-type"].startswith("text/html")


def test_vulnerable_reflects_markup_unescaped(labs):
    response = search(labs, "vulnerable", PAYLOAD)
    assert PAYLOAD in response.text
    assert "content-security-policy" not in response.headers


def test_fixed_escapes_markup(labs):
    body = search(labs, "fixed", PAYLOAD).text
    assert PAYLOAD not in body
    assert "&lt;img src=x onerror=alert(1)&gt;" in body


def test_fixed_sends_restrictive_csp(labs):
    csp = search(labs, "fixed", "x").headers["content-security-policy"]
    assert "script-src 'self'" in csp
    assert "default-src 'none'" in csp


def test_responses_are_not_sniffable(labs):
    assert search(labs, "fixed", "x").headers["x-content-type-options"] == "nosniff"


def test_beacon_marks_challenge_only_in_vulnerable_mode(labs):
    labs.get("/xss/fixed/beacon")
    assert labs.get("/xss/status").json()["solved"] is False
    labs.get("/xss/vulnerable/beacon")
    assert labs.get("/xss/status").json()["solved"] is True


def test_lab_script_is_served(labs):
    assert "postMessage" in labs.get("/xss/static/lab.js").text
