"""Automatic verification: run reference attacks against both lab modes.

For every lab we prove two things with real HTTP requests:
  * the *vulnerable* mode is exploitable (each attack check must succeed), and
  * the *fixed* mode blocks the same attacks while normal use still works.
Requests carry a verifier header so they never count as the learner's own exploit.
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import re
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

import httpx

from ..catalog import MODES, I18n

VERIFIER_HEADER = {"x-websec-verifier": "1"}


@dataclass
class CheckResult:
    id: str
    title: I18n
    mode: str
    kind: str  # functional | attack | defense
    passed: bool
    evidence: str


def T(en: str, ru: str) -> I18n:
    return {"en": en, "ru": ru}


class Probe:
    """Sends verifier-flagged requests to /<lab>/<mode>/<path>."""

    def __init__(self, http: httpx.AsyncClient, lab_id: str) -> None:
        self.http = http
        self.lab_id = lab_id
        self.results: list[CheckResult] = []

    async def req(self, mode: str, method: str, path: str, **kwargs: Any) -> httpx.Response:
        headers = {**VERIFIER_HEADER, **kwargs.pop("headers", {})}
        return await self.http.request(method, f"/{self.lab_id}/{mode}{path}", headers=headers, **kwargs)

    async def reset(self) -> None:
        await self.http.post(f"/{self.lab_id}/reset", headers=VERIFIER_HEADER)

    def functional(self, id: str, title: I18n, mode: str, ok: bool, evidence: str) -> None:
        self.results.append(CheckResult(id, title, mode, "functional", ok, evidence))

    def attack(self, id: str, title: I18n, mode: str, succeeded: bool, evidence: str) -> None:
        """The attack must succeed in vulnerable mode and be blocked in fixed mode."""
        if mode == "vulnerable":
            self.results.append(CheckResult(id, title, mode, "attack", succeeded, evidence))
        else:
            self.results.append(CheckResult(id, title, mode, "defense", not succeeded, evidence))


def _json(response: httpx.Response) -> dict[str, Any]:
    try:
        data = response.json()
    except ValueError:
        return {}
    return data if isinstance(data, dict) else {}


# --- SQL injection -----------------------------------------------------------------
HIDDEN_PRODUCTS = {"Prototype X-9000", "Staff Discount Card"}
USER_SECRETS = {"Adm1n-S3cret!", "alice-secret-pw", "bob-secret-pw"}
SQLI_BYPASS = "' OR 1=1 --"
SQLI_UNION = "' UNION SELECT id, username, secret, 0 FROM users --"


async def verify_sql_injection(p: Probe) -> None:
    for mode in MODES:
        data = _json(await p.req(mode, "GET", "/products", params={"name": "Laptop Pro"}))
        names = [r.get("name") for r in data.get("rows", [])]
        p.functional(
            "normal-search", T("Normal search returns the product", "Обычный поиск возвращает товар"),
            mode, names == ["Laptop Pro"], f"rows={names}",
        )

        data = _json(await p.req(mode, "GET", "/products", params={"name": SQLI_BYPASS}))
        leaked = HIDDEN_PRODUCTS & {r.get("name") for r in data.get("rows", [])}
        p.attack(
            "filter-bypass", T("Injected OR 1=1 exposes unreleased products", "Внедрённый OR 1=1 раскрывает невыпущенные товары"),
            mode, bool(leaked), f"{data.get('count', 0)} row(s); unreleased: {sorted(leaked) or 'none'}",
        )

        data = _json(await p.req(mode, "GET", "/products", params={"name": SQLI_UNION}))
        secrets = [v for r in data.get("rows", []) for v in r.values() if v in USER_SECRETS]
        p.attack(
            "union-exfiltration", T("UNION SELECT reads secrets from the users table", "UNION SELECT читает секреты из таблицы users"),
            mode, bool(secrets), f"{data.get('count', 0)} row(s); secret values exposed: {len(secrets)}",
        )


# --- Reflected XSS -----------------------------------------------------------------
XSS_IMG = "<img src=x onerror=alert(1)>"
XSS_SCRIPT = "<script>alert(1)</script>"


async def verify_xss(p: Probe) -> None:
    for mode in MODES:
        r = await p.req(mode, "GET", "/search", params={"q": "hello-websec"})
        p.functional(
            "plain-text", T("Plain text is displayed", "Обычный текст отображается"), mode,
            r.status_code == 200 and "hello-websec" in r.text and r.headers.get("content-type", "").startswith("text/html"),
            f"status={r.status_code}",
        )
        for check_id, payload, title in (
            ("img-onerror", XSS_IMG, T("<img onerror> payload is reflected as live markup", "Нагрузка <img onerror> отражается как живая разметка")),
            ("script-tag", XSS_SCRIPT, T("<script> payload is reflected as live markup", "Нагрузка <script> отражается как живая разметка")),
        ):
            r = await p.req(mode, "GET", "/search", params={"q": payload})
            p.attack(check_id, title, mode, payload in r.text, "payload present verbatim" if payload in r.text else "payload escaped or absent")
        r = await p.req(mode, "GET", "/search", params={"q": "x"})
        csp = r.headers.get("content-security-policy", "")
        p.attack(
            "no-csp", T("No Content-Security-Policy limits script execution", "Нет Content-Security-Policy, ограничивающей выполнение скриптов"),
            mode, "script-src" not in csp, f"CSP: {csp or 'absent'}",
        )


# --- IDOR --------------------------------------------------------------------------
ALICE = {"Authorization": "Bearer alice-demo-token"}
BOB = {"Authorization": "Bearer bob-demo-token"}


async def verify_idor(p: Probe) -> None:
    for mode in MODES:
        r = await p.req(mode, "GET", "/bookings/101", headers=ALICE)
        p.functional(
            "own-booking", T("Owner can read their own booking", "Владелец читает своё бронирование"),
            mode, r.status_code == 200 and _json(r).get("owner") == "alice", f"status={r.status_code}",
        )
        r = await p.req(mode, "GET", "/bookings/101")
        p.functional(
            "auth-required", T("Anonymous requests are rejected", "Анонимные запросы отклоняются"),
            mode, r.status_code == 401, f"status={r.status_code}",
        )
        r = await p.req(mode, "GET", "/bookings/102", headers=ALICE)
        p.attack(
            "alice-reads-bob", T("Alice can read Bob's booking 102", "Alice читает бронирование 102 пользователя Bob"),
            mode, r.status_code == 200 and _json(r).get("owner") == "bob", f"status={r.status_code}",
        )
        r = await p.req(mode, "GET", "/bookings/101", headers=BOB)
        p.attack(
            "bob-reads-alice", T("Bob can read Alice's booking 101", "Bob читает бронирование 101 пользователя Alice"),
            mode, r.status_code == 200 and _json(r).get("owner") == "alice", f"status={r.status_code}",
        )


# --- Broken authentication ---------------------------------------------------------
PASSWORD = "sunshine"


async def _login(p: Probe, mode: str, user: str, password: str) -> httpx.Response:
    return await p.req(mode, "POST", "/login", json={"username": user, "password": password})


def _sequential(a: str, b: str) -> bool:
    ma, mb = re.fullmatch(r"(.*?)(\d+)", a), re.fullmatch(r"(.*?)(\d+)", b)
    return bool(ma and mb and ma[1] == mb[1] and int(mb[2]) - int(ma[2]) == 1)


async def verify_broken_auth(p: Probe) -> None:
    for mode in MODES:
        await p.reset()
        r = await _login(p, mode, "alice", PASSWORD)
        token = _json(r).get("token", "")
        me = await p.req(mode, "GET", "/me", headers={"Authorization": f"Bearer {token}"})
        p.functional(
            "valid-login", T("Valid credentials create a working session", "Верные данные создают рабочую сессию"),
            mode, r.status_code == 200 and me.status_code == 200, f"login={r.status_code}, me={me.status_code}",
        )

        unknown, wrong = await _login(p, mode, "nobody", "x"), await _login(p, mode, "alice", "x")
        differ = (unknown.status_code, unknown.text) != (wrong.status_code, wrong.text)
        p.attack(
            "user-enumeration", T("Errors reveal which usernames exist", "Ошибки раскрывают существующие имена пользователей"),
            mode, differ, f"unknown={unknown.status_code}, wrong password={wrong.status_code}",
        )

        await p.reset()
        codes = [(await _login(p, mode, "alice", f"guess-{i}")).status_code for i in range(8)]
        final = (await _login(p, mode, "alice", PASSWORD)).status_code
        p.attack(
            "brute-force", T("Unlimited guessing: the right password still works after 8 failures", "Неограниченный подбор: верный пароль работает после 8 неудач"),
            mode, 429 not in codes and final == 200, f"failures={sorted(set(codes))}, then correct password={final}",
        )

        await p.reset()
        first = _json(await _login(p, mode, "alice", PASSWORD)).get("token", "")
        second = _json(await _login(p, mode, "alice", PASSWORD)).get("token", "")
        predictable = len(first) < 32 or _sequential(first, second)
        p.attack(
            "predictable-token", T("Session tokens are short or sequential", "Токены сессий короткие или последовательные"),
            mode, predictable, f"len={len(first)}, sequential={_sequential(first, second)}",
        )

        await p.reset()
        token = _json(await _login(p, mode, "alice", PASSWORD)).get("token", "")
        headers = {"Authorization": f"Bearer {token}"}
        await p.req(mode, "POST", "/logout", headers=headers)
        after = await p.req(mode, "GET", "/me", headers=headers)
        p.attack(
            "logout-ineffective", T("Session still works after logout", "Сессия работает после выхода"),
            mode, after.status_code == 200, f"/me after logout={after.status_code}",
        )
    await p.reset()


# --- Stored XSS --------------------------------------------------------------------
async def verify_stored_xss(p: Probe) -> None:
    async def post(mode: str, author: str, text: str) -> None:
        await p.req(mode, "POST", "/comments", json={"author": author, "text": text})

    for mode in MODES:
        await p.reset()
        await post(mode, "Alice", "hello-websec")
        r = await p.req(mode, "GET", "/page")
        p.functional(
            "comment-shown", T("A posted comment is displayed", "Отправленный комментарий отображается"),
            mode, r.status_code == 200 and "hello-websec" in r.text, f"status={r.status_code}",
        )

        await p.reset()
        await post(mode, "Eve", XSS_IMG)
        first, second = await p.req(mode, "GET", "/page"), await p.req(mode, "GET", "/page")
        both = XSS_IMG in first.text and XSS_IMG in second.text
        p.attack(
            "stored-text", T("Stored markup in the comment text is served as live HTML on every load", "Сохранённая разметка в тексте комментария отдаётся как живой HTML при каждой загрузке"),
            mode, both, "payload present verbatim on 2 loads" if both else "payload escaped or absent",
        )

        await p.reset()
        await post(mode, XSS_SCRIPT, "hi")
        r = await p.req(mode, "GET", "/page")
        p.attack(
            "stored-author", T("Stored markup in the author field is served as live HTML", "Сохранённая разметка в поле автора отдаётся как живой HTML"),
            mode, XSS_SCRIPT in r.text, "payload present verbatim" if XSS_SCRIPT in r.text else "payload escaped or absent",
        )
        csp = r.headers.get("content-security-policy", "")
        p.attack(
            "no-csp", T("No Content-Security-Policy limits script execution", "Нет Content-Security-Policy, ограничивающей выполнение скриптов"),
            mode, "script-src" not in csp, f"CSP: {csp or 'absent'}",
        )
    await p.reset()


# --- Broken access control ----------------------------------------------------------
ADMIN = {"Authorization": "Bearer admin-demo-token"}


async def verify_access_control(p: Probe) -> None:
    for mode in MODES:
        await p.reset()
        r = await p.req(mode, "GET", "/admin/users", headers=ADMIN)
        p.functional(
            "admin-lists-users", T("An administrator can list users", "Администратор видит список пользователей"),
            mode, r.status_code == 200 and len(_json(r).get("users", [])) == 3, f"status={r.status_code}",
        )
        r = await p.req(mode, "PATCH", "/profile", headers=ALICE, json={"display_name": "Ally"})
        p.functional(
            "edit-own-name", T("A user can change their own display name", "Пользователь может изменить своё отображаемое имя"),
            mode, r.status_code == 200 and _json(r).get("display_name") == "Ally", f"status={r.status_code}",
        )

        r = await p.req(mode, "GET", "/admin/users", headers=ALICE)
        p.attack(
            "admin-endpoint", T("A regular user can read the admin user list", "Обычный пользователь читает список пользователей админки"),
            mode, r.status_code == 200, f"status={r.status_code}",
        )

        await p.reset()
        r = await p.req(mode, "PATCH", "/profile", headers=ALICE, json={"role": "admin"})
        me = _json(await p.req(mode, "GET", "/me", headers=ALICE))
        p.attack(
            "mass-assignment", T("A user can set their own role to admin", "Пользователь может назначить себе роль admin"),
            mode, me.get("role") == "admin", f"PATCH={r.status_code}, role afterwards={me.get('role')}",
        )
    await p.reset()


# --- Security misconfiguration ------------------------------------------------------
HARDENING = ("x-content-type-options", "x-frame-options", "content-security-policy", "referrer-policy")


async def verify_security_misconfiguration(p: Probe) -> None:
    for mode in MODES:
        r = await p.req(mode, "GET", "/orders/1001")
        p.functional(
            "valid-order", T("A valid order is returned", "Корректный заказ возвращается"),
            mode, r.status_code == 200 and _json(r).get("id") == 1001, f"status={r.status_code}",
        )

        r = await p.req(mode, "GET", "/debug/config")
        exposed = r.status_code == 200 and "secret_key" in r.text
        p.attack(
            "debug-endpoint", T("A debug endpoint exposes configuration and secrets", "Debug-эндпоинт раскрывает конфигурацию и секреты"),
            mode, exposed, f"status={r.status_code}",
        )

        r = await p.req(mode, "GET", "/orders/abc")
        p.attack(
            "verbose-errors", T("Errors expose stack traces and internals", "Ошибки раскрывают стек-трейсы и внутренности"),
            mode, "Traceback" in r.text, f"status={r.status_code}, traceback={'yes' if 'Traceback' in r.text else 'no'}",
        )

        r = await p.req(mode, "GET", "/ping")
        missing = [h for h in HARDENING if h not in r.headers]
        banners = [h for h in ("x-powered-by", "x-app-version") if h in r.headers]
        p.attack(
            "headers", T("Security headers are missing and version banners are sent", "Заголовки безопасности отсутствуют, отправляются баннеры версий"),
            mode, len(missing) == len(HARDENING) and bool(banners), f"missing={missing or 'none'}, banners={banners or 'none'}",
        )


# --- Path traversal -----------------------------------------------------------------
APP_ENV_SECRET = "SECRET_KEY=dev-secret-key-123"


async def verify_path_traversal(p: Probe) -> None:
    for mode in MODES:
        for check_id, name, title in (
            ("document", "welcome.txt", T("A document can be read", "Документ читается")),
            ("nested-document", "guides/start.txt", T("A nested document can be read", "Вложенный документ читается")),
        ):
            r = await p.req(mode, "GET", "/files", params={"name": name})
            p.functional(check_id, title, mode, r.status_code == 200 and bool(_json(r).get("content")), f"status={r.status_code}")

        r = await p.req(mode, "GET", "/files", params={"name": "../../config/app.env"})
        p.attack(
            "dotdot", T("../ segments read the application config outside the documents folder", "Сегменты ../ читают конфигурацию приложения вне папки документов"),
            mode, APP_ENV_SECRET in r.text, f"status={r.status_code}",
        )
        r = await p.req(mode, "GET", "/files", params={"name": "/etc/passwd"})
        p.attack(
            "absolute-path", T("An absolute path reads a system file", "Абсолютный путь читает системный файл"),
            mode, "root:x:0:0" in r.text, f"status={r.status_code}",
        )
        r = await p.req(mode, "GET", "/files", params={"name": "guides/../../../config/app.env"})
        p.attack(
            "nested-dotdot", T("A traversal hidden inside a valid-looking path still escapes", "Обход, спрятанный в правдоподобном пути, всё равно выходит за папку"),
            mode, APP_ENV_SECRET in r.text, f"status={r.status_code}",
        )


# --- CSRF ----------------------------------------------------------------------------
async def verify_csrf(p: Probe) -> None:
    async def forged(mode: str, **extra: Any) -> dict[str, Any]:
        await p.reset()
        return _json(await p.req(mode, "POST", "/browser/visit-attacker-page", json={"to": "mallory", "amount": 500, **extra}))

    for mode in MODES:
        await p.reset()
        r = _json(await p.req(mode, "POST", "/browser/transfer", json={"to": "bob", "amount": 50}))
        p.functional(
            "legit-transfer", T("Alice can transfer money from the bank's own page", "Alice может перевести деньги со страницы самого банка"),
            mode, r.get("bank_status") == 200 and r.get("ledger", {}).get("bob") == 250, f"bank status={r.get('bank_status')}",
        )

        r = await forged(mode)
        p.attack(
            "forged-transfer", T("A form on another site moves Alice's money", "Форма на другом сайте переводит деньги Alice"),
            mode, r.get("bank_status") == 200 and r.get("ledger", {}).get("mallory") == 500,
            f"bank status={r.get('bank_status')}, mallory={r.get('ledger', {}).get('mallory')}",
        )

        r = await forged(mode, strip_headers=True)
        p.attack(
            "forged-without-origin", T("The forgery also works when the browser sends no Origin header", "Подделка работает и когда браузер не отправил заголовок Origin"),
            mode, r.get("bank_status") == 200 and r.get("ledger", {}).get("mallory") == 500,
            f"bank status={r.get('bank_status')}, mallory={r.get('ledger', {}).get('mallory')}",
        )
    await p.reset()


# --- JWT -----------------------------------------------------------------------------
def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _jwt(header: dict[str, Any], claims: dict[str, Any], secret: bytes | None) -> str:
    head = f"{_b64(json.dumps(header).encode())}.{_b64(json.dumps(claims).encode())}"
    signature = b"" if secret is None else hmac.new(secret, head.encode(), hashlib.sha256).digest()
    return f"{head}.{_b64(signature)}"


async def verify_jwt(p: Probe) -> None:
    async def get(mode: str, path: str, token: str) -> httpx.Response:
        return await p.req(mode, "GET", path, headers={"Authorization": f"Bearer {token}"})

    future = int(time.time()) + 600
    for mode in MODES:
        await p.reset()
        token = _json(await p.req(mode, "POST", "/login", json={"username": "alice", "password": "wonderland"})).get("token", "")
        me = await get(mode, "/me", token)
        p.functional(
            "login", T("A valid login returns a working token", "Верный вход возвращает рабочий токен"),
            mode, me.status_code == 200 and _json(me).get("role") == "user", f"/me={me.status_code}",
        )
        admin = _json(await p.req(mode, "POST", "/login", json={"username": "admin", "password": "Tr0ub4dor&3"})).get("token", "")
        r = await get(mode, "/admin", admin)
        p.functional(
            "admin-login", T("A real administrator can open /admin", "Настоящий администратор открывает /admin"),
            mode, r.status_code == 200, f"/admin={r.status_code}",
        )

        none_token = _jwt({"alg": "none", "typ": "JWT"}, {"sub": "alice", "role": "admin", "exp": future}, None)
        r = await get(mode, "/admin", none_token)
        p.attack(
            "alg-none", T("An unsigned token (alg: none) is accepted as administrator", "Неподписанный токен (alg: none) принимается как администратор"),
            mode, r.status_code == 200, f"/admin={r.status_code}",
        )

        weak = _jwt({"alg": "HS256", "typ": "JWT"}, {"sub": "alice", "role": "admin", "exp": future}, b"secret")
        r = await get(mode, "/admin", weak)
        p.attack(
            "weak-secret", T("A token signed with the guessable secret \"secret\" is accepted", "Токен, подписанный угадываемым секретом «secret», принимается"),
            mode, r.status_code == 200, f"/admin={r.status_code}",
        )

        expired = _jwt({"alg": "HS256", "typ": "JWT"}, {"sub": "alice", "role": "user", "exp": 1}, b"secret")
        r = await get(mode, "/me", expired)
        p.attack(
            "expired-token", T("A token that expired in 1970 is still accepted", "Токен, истёкший в 1970 году, всё ещё принимается"),
            mode, r.status_code == 200, f"/me={r.status_code}",
        )
    await p.reset()


# --- File upload ---------------------------------------------------------------------
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16
ACTIVE_HTML = b"<h1>pwned</h1><script>parent.postMessage('x','*')</script>"
SVG_SCRIPT = b'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'


async def verify_file_upload(p: Probe) -> None:
    async def upload(mode: str, name: str, data: bytes, content_type: str) -> httpx.Response:
        return await p.req(mode, "POST", "/upload", files={"file": (name, data, content_type)})

    async def served(mode: str, response: httpx.Response) -> httpx.Response | None:
        if response.status_code != 201:
            return None
        return await p.req(mode, "GET", f"/uploads/{_json(response)['filename']}")

    for mode in MODES:
        await p.reset()
        r = await upload(mode, "avatar.png", PNG_BYTES, "image/png")
        got = await served(mode, r)
        p.functional(
            "valid-image", T("A real PNG can be uploaded and displayed", "Настоящий PNG загружается и отображается"),
            mode, got is not None and got.content == PNG_BYTES and got.headers.get("content-type", "").startswith("image/png"),
            f"upload={r.status_code}",
        )

        r = await upload(mode, "evil.html", ACTIVE_HTML, "text/html")
        got = await served(mode, r)
        ctype = got.headers.get("content-type", "") if got is not None else "-"
        p.attack(
            "html-as-html", T("An HTML file is stored and served as text/html", "HTML-файл сохраняется и отдаётся как text/html"),
            mode, got is not None and ctype.startswith("text/html"), f"upload={r.status_code}, served as {ctype}",
        )

        r = await upload(mode, "avatar.png", ACTIVE_HTML, "image/png")
        p.attack(
            "polyglot", T("HTML disguised as avatar.png is accepted (content is never inspected)", "HTML под видом avatar.png принимается (содержимое не проверяется)"),
            mode, r.status_code == 201, f"upload={r.status_code}",
        )

        r = await upload(mode, "logo.svg", SVG_SCRIPT, "image/svg+xml")
        got = await served(mode, r)
        ctype = got.headers.get("content-type", "") if got is not None else "-"
        p.attack(
            "svg-script", T("An SVG with a script handler is served as image/svg+xml", "SVG со скриптом отдаётся как image/svg+xml"),
            mode, got is not None and ctype.startswith("image/svg"), f"upload={r.status_code}, served as {ctype}",
        )
    await p.reset()


# --- Race condition ------------------------------------------------------------------
COUPON = {"code": "WELCOME10"}
BURST = 10


async def verify_race_condition(p: Probe) -> None:
    for mode in MODES:
        await p.reset()
        first = await p.req(mode, "POST", "/redeem", json=COUPON)
        second = await p.req(mode, "POST", "/redeem", json=COUPON)
        wallet = _json(await p.req(mode, "GET", "/wallet"))
        p.functional(
            "single-use", T("Sequential use: the coupon works once, then is refused", "Последовательное использование: купон работает один раз, затем отклоняется"),
            mode, (first.status_code, second.status_code, wallet.get("balance")) == (200, 409, 10),
            f"first={first.status_code}, second={second.status_code}, balance={wallet.get('balance')}",
        )

        await p.reset()
        responses = await asyncio.gather(*(p.req(mode, "POST", "/redeem", json=COUPON) for _ in range(BURST)))
        wallet = _json(await p.req(mode, "GET", "/wallet"))
        accepted = sum(r.status_code == 200 for r in responses)
        p.attack(
            "parallel-redeem", T(f"{BURST} simultaneous requests redeem the single-use coupon more than once", f"{BURST} одновременных запросов применяют одноразовый купон более одного раза"),
            mode, wallet.get("balance", 0) > 10, f"{accepted} of {BURST} accepted, balance={wallet.get('balance')}",
        )
    await p.reset()


VERIFIERS: dict[str, Callable[[Probe], Awaitable[None]]] = {
    "sql-injection": verify_sql_injection,
    "xss": verify_xss,
    "idor": verify_idor,
    "broken-auth": verify_broken_auth,
    "stored-xss": verify_stored_xss,
    "broken-access-control": verify_access_control,
    "security-misconfiguration": verify_security_misconfiguration,
    "path-traversal": verify_path_traversal,
    "csrf": verify_csrf,
    "jwt": verify_jwt,
    "file-upload": verify_file_upload,
    "race-condition": verify_race_condition,
}


@dataclass
class Verdict:
    results: list[CheckResult]
    vulnerability_confirmed: bool
    fix_confirmed: bool


async def run_verification(lab_id: str, http: httpx.AsyncClient) -> Verdict:
    probe = Probe(http, lab_id)
    await VERIFIERS[lab_id](probe)
    results = probe.results
    vulnerable = [r for r in results if r.mode == "vulnerable"]
    fixed = [r for r in results if r.mode == "fixed"]
    return Verdict(
        results=results,
        vulnerability_confirmed=bool(vulnerable) and all(r.passed for r in vulnerable),
        fix_confirmed=bool(fixed) and all(r.passed for r in fixed),
    )
