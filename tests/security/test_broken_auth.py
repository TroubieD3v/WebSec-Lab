import re

LAB = "broken-auth"


def login(labs, mode, user="alice", password="sunshine"):
    return labs.post(f"/{LAB}/{mode}/login", json={"username": user, "password": password})


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_valid_login_works_in_both_modes(labs):
    for mode in ("vulnerable", "fixed"):
        token = login(labs, mode).json()["token"]
        assert labs.get(f"/{LAB}/{mode}/me", headers=auth(token)).json()["username"] == "alice"


def test_vulnerable_login_reveals_which_users_exist(labs):
    unknown = login(labs, "vulnerable", "nobody", "x")
    wrong = login(labs, "vulnerable", "alice", "x")
    assert (unknown.status_code, unknown.json()) != (wrong.status_code, wrong.json())


def test_fixed_login_gives_identical_errors(labs):
    unknown = login(labs, "fixed", "nobody", "x")
    wrong = login(labs, "fixed", "alice", "x")
    assert (unknown.status_code, unknown.json()) == (wrong.status_code, wrong.json())
    assert unknown.status_code == 401


def test_vulnerable_allows_unlimited_guessing(labs):
    codes = [login(labs, "vulnerable", "alice", f"guess{i}").status_code for i in range(30)]
    assert 429 not in codes
    assert login(labs, "vulnerable").status_code == 200


def test_fixed_locks_account_after_repeated_failures(labs):
    codes = [login(labs, "fixed", "alice", f"guess{i}").status_code for i in range(8)]
    assert codes[:5] == [401] * 5 and set(codes[5:]) == {429}
    locked = login(labs, "fixed")  # even the right password is refused while locked
    assert locked.status_code == 429 and "retry-after" in locked.headers


def test_vulnerable_tokens_are_sequential(labs):
    first = login(labs, "vulnerable").json()["token"]
    second = login(labs, "vulnerable").json()["token"]
    assert int(second.split("-")[1]) == int(first.split("-")[1]) + 1


def test_fixed_tokens_are_random_and_long(labs):
    tokens = {login(labs, "fixed").json()["token"] for _ in range(3)}
    assert len(tokens) == 3
    assert all(len(t) >= 32 and not re.fullmatch(r"sess-\d+", t) for t in tokens)


def test_vulnerable_session_survives_logout(labs):
    token = login(labs, "vulnerable").json()["token"]
    labs.post(f"/{LAB}/vulnerable/logout", headers=auth(token))
    assert labs.get(f"/{LAB}/vulnerable/me", headers=auth(token)).status_code == 200


def test_fixed_session_dies_on_logout(labs):
    token = login(labs, "fixed").json()["token"]
    labs.post(f"/{LAB}/fixed/logout", headers=auth(token))
    assert labs.get(f"/{LAB}/fixed/me", headers=auth(token)).status_code == 401


def test_challenge_solved_by_brute_force(labs):
    for i in range(10):
        login(labs, "vulnerable", "alice", f"guess{i}")
    assert labs.get(f"/{LAB}/status").json()["solved"] is False
    login(labs, "vulnerable")
    assert labs.get(f"/{LAB}/status").json()["solved"] is True


def test_challenge_solved_by_reusing_session_after_logout(labs):
    token = login(labs, "vulnerable").json()["token"]
    labs.post(f"/{LAB}/vulnerable/logout", headers=auth(token))
    assert labs.get(f"/{LAB}/status").json()["solved"] is False
    labs.get(f"/{LAB}/vulnerable/me", headers=auth(token))
    assert labs.get(f"/{LAB}/status").json()["solved"] is True
