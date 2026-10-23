import base64
import hashlib
import hmac
import json
import time

LAB = "jwt"


def b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def make(header: dict, claims: dict, secret: bytes | None) -> str:
    head = b64(json.dumps(header).encode()) + "." + b64(json.dumps(claims).encode())
    sig = b"" if secret is None else hmac.new(secret, head.encode(), hashlib.sha256).digest()
    return f"{head}.{b64(sig)}"


def login(labs, mode, user="alice", password="wonderland"):
    return labs.post(f"/{LAB}/{mode}/login", json={"username": user, "password": password})


def call(labs, mode, path, token):
    return labs.get(f"/{LAB}/{mode}/{path}", headers={"Authorization": f"Bearer {token}"})


def test_login_and_me_work_in_both_modes(labs):
    for mode in ("vulnerable", "fixed"):
        token = login(labs, mode).json()["token"]
        assert call(labs, mode, "me", token).json() == {"user": "alice", "role": "user"}
        assert login(labs, mode, password="nope").status_code == 401


def test_regular_user_cannot_open_admin_in_either_mode(labs):
    for mode in ("vulnerable", "fixed"):
        assert call(labs, mode, "admin", login(labs, mode).json()["token"]).status_code == 403


def test_real_admin_can_open_admin_in_both_modes(labs):
    for mode in ("vulnerable", "fixed"):
        token = login(labs, mode, "admin", "Tr0ub4dor&3").json()["token"]
        assert call(labs, mode, "admin", token).status_code == 200


def test_vulnerable_accepts_unsigned_alg_none_token(labs):
    token = make({"alg": "none", "typ": "JWT"}, {"sub": "alice", "role": "admin"}, None)
    assert call(labs, "vulnerable", "admin", token).status_code == 200


def test_fixed_rejects_alg_none(labs):
    token = make({"alg": "none", "typ": "JWT"}, {"sub": "alice", "role": "admin", "exp": int(time.time()) + 600}, None)
    assert call(labs, "fixed", "admin", token).status_code == 401


def test_vulnerable_secret_is_guessable_so_tokens_can_be_forged(labs):
    token = make({"alg": "HS256", "typ": "JWT"}, {"sub": "alice", "role": "admin"}, b"secret")
    assert call(labs, "vulnerable", "admin", token).status_code == 200


def test_fixed_rejects_tokens_signed_with_the_weak_secret(labs):
    token = make({"alg": "HS256", "typ": "JWT"}, {"sub": "alice", "role": "admin", "exp": int(time.time()) + 600}, b"secret")
    assert call(labs, "fixed", "admin", token).status_code == 401


def test_vulnerable_ignores_expiry_fixed_enforces_it(labs, monkeypatch):
    import jwt_misconfig.router as jwt_lab

    token = login(labs, "fixed").json()["token"]
    assert call(labs, "fixed", "me", token).status_code == 200
    real_time = time.time
    monkeypatch.setattr(jwt_lab.time, "time", lambda: real_time() + 10_000)
    assert call(labs, "fixed", "me", token).status_code == 401
    vulnerable = make({"alg": "HS256"}, {"sub": "alice", "role": "user", "exp": 1}, b"secret")
    assert call(labs, "vulnerable", "me", vulnerable).status_code == 200


def test_fixed_rejects_tampered_payload_and_garbage(labs):
    token = login(labs, "fixed").json()["token"]
    head, _, sig = token.split(".")
    forged = f"{head}.{b64(json.dumps({'sub': 'alice', 'role': 'admin', 'exp': int(time.time()) + 600}).encode())}.{sig}"
    assert call(labs, "fixed", "admin", forged).status_code == 401
    for junk in ("", "a.b", "a.b.c", "....", "x" * 50):
        assert call(labs, "fixed", "me", junk).status_code == 401
    assert labs.get(f"/{LAB}/fixed/me").status_code == 401


def test_fixed_secret_is_random_per_reset(labs):
    import jwt_misconfig.router as jwt_lab

    before = jwt_lab.STATE.strong_secret
    labs.post(f"/{LAB}/reset")
    assert jwt_lab.STATE.strong_secret != before and len(jwt_lab.STATE.strong_secret) == 32


def test_challenge_solved_only_by_a_forged_token(labs):
    token = login(labs, "vulnerable", "admin", "Tr0ub4dor&3").json()["token"]
    call(labs, "vulnerable", "admin", token)  # a genuinely issued admin token is not an exploit
    assert labs.get(f"/{LAB}/status").json()["solved"] is False
    forged = make({"alg": "none"}, {"sub": "x", "role": "admin"}, None)
    call(labs, "vulnerable", "admin", forged)
    assert labs.get(f"/{LAB}/status").json()["solved"] is True
