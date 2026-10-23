LAB = "csrf"


def ledger(labs, mode):
    return labs.get(f"/{LAB}/{mode}/browser/account").json()["ledger"]


def forged(labs, mode, to="mallory", amount=500, strip=False):
    return labs.post(f"/{LAB}/{mode}/browser/visit-attacker-page", json={"to": to, "amount": amount, "strip_headers": strip})


def legit(labs, mode, to="bob", amount=50):
    return labs.post(f"/{LAB}/{mode}/browser/transfer", json={"to": to, "amount": amount})


def test_legitimate_transfer_works_in_both_modes(labs):
    for mode in ("vulnerable", "fixed"):
        response = legit(labs, mode).json()
        assert response["bank_status"] == 200
        assert response["ledger"]["alice"] == 950 and response["ledger"]["bob"] == 250


def test_vulnerable_bank_accepts_a_forged_cross_site_transfer(labs):
    response = forged(labs, "vulnerable").json()
    assert response["bank_status"] == 200
    assert response["ledger"]["mallory"] == 500 and response["ledger"]["alice"] == 500


def test_vulnerable_bank_also_accepts_it_without_origin_headers(labs):
    assert forged(labs, "vulnerable", strip=True).json()["bank_status"] == 200


def test_fixed_bank_blocks_the_cross_site_request(labs):
    response = forged(labs, "fixed").json()
    assert response["bank_status"] == 403
    assert response["ledger"]["mallory"] == 0 and response["ledger"]["alice"] == 1000


def test_fixed_bank_requires_the_token_even_without_origin_headers(labs):
    response = forged(labs, "fixed", strip=True).json()
    assert response["bank_status"] == 403 and "token" in response["bank_response"]["detail"].lower()
    assert ledger(labs, "fixed")["mallory"] == 0


def test_fixed_account_exposes_a_token_but_vulnerable_does_not(labs):
    assert "csrf_token" in labs.get(f"/{LAB}/fixed/browser/account").json()["bank_response"]
    assert "csrf_token" not in labs.get(f"/{LAB}/vulnerable/browser/account").json()["bank_response"]


def test_bank_requires_a_session_cookie(labs):
    for mode in ("vulnerable", "fixed"):
        assert labs.post(f"/{LAB}/{mode}/bank/transfer", data={"to": "bob", "amount": "5"}).status_code == 401
        assert labs.get(f"/{LAB}/{mode}/bank/account").status_code == 401


def test_invalid_transfers_are_rejected(labs):
    assert forged(labs, "vulnerable", to="nobody").json()["bank_status"] == 400
    assert forged(labs, "vulnerable", amount=5000).json()["bank_status"] == 400


def test_session_cookie_never_reaches_the_learner(labs):
    body = forged(labs, "vulnerable").text + legit(labs, "vulnerable").text
    assert "session=" not in body and "set-cookie" not in forged(labs, "vulnerable").headers


def test_challenge_solved_only_by_a_forged_request_in_vulnerable_mode(labs):
    legit(labs, "vulnerable")
    forged(labs, "fixed")
    forged(labs, "vulnerable").status_code
    labs.post("/reset-all")
    labs.post(f"/{LAB}/vulnerable/browser/visit-attacker-page", json={"to": "mallory", "amount": 5}, headers={"x-websec-verifier": "1"})
    assert labs.get(f"/{LAB}/status").json()["solved"] is False
    forged(labs, "vulnerable")
    assert labs.get(f"/{LAB}/status").json()["solved"] is True


def test_reset_restores_balances(labs):
    forged(labs, "vulnerable")
    labs.post(f"/{LAB}/reset")
    assert ledger(labs, "vulnerable") == {"alice": 1000, "bob": 200, "mallory": 0}


def test_bank_can_be_reset_per_mode(labs):
    forged(labs, "vulnerable")
    forged(labs, "fixed")
    labs.post(f"/{LAB}/vulnerable/browser/reset")
    assert ledger(labs, "vulnerable")["mallory"] == 0
    assert labs.get(f"/{LAB}/vulnerable/browser/account").json()["bank_status"] == 200
