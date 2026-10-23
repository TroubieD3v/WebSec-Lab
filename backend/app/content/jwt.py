from ..catalog import LabDefinition, Preset, Reference

JSON = {"Content-Type": "application/json"}
BEARER = {"Authorization": "Bearer PASTE_TOKEN_HERE"}

LAB = LabDefinition(
    id="jwt",
    difficulty="hard",
    owasp="A07:2025",
    owasp_name="Authentication Failures",
    cwe=("CWE-347", "CWE-327", "CWE-521"),
    title={"en": "JWT Misconfiguration: Forged Admin Token", "ru": "Ошибки JWT: поддельный токен администратора"},
    summary={
        "en": "The verifier trusts the token's own algorithm header, signs with a guessable secret, and ignores expiry.",
        "ru": "Проверка доверяет заголовку алгоритма самого токена, подписывает угадываемым секретом и игнорирует срок жизни.",
    },
    task={
        "en": "Log in as `alice` (password `wonderland`) and decode your token. You are a regular user, but the "
        "`/admin` endpoint trusts whatever the token says. Forge a token that makes you an administrator, in two "
        "different ways. In Fixed mode neither must work.",
        "ru": "Войдите как `alice` (пароль `wonderland`) и декодируйте свой токен. Вы обычный пользователь, но "
        "эндпоинт `/admin` верит тому, что написано в токене. Подделайте токен администратора двумя разными "
        "способами. В защищённом режиме ни один не должен работать.",
    },
    root_cause={
        "en": "Three flaws. The verifier reads `alg` from the untrusted header, so `alg: none` skips the signature check "
        "entirely. The HMAC secret is a dictionary word that can be guessed offline. Claims such as `exp` are never "
        "validated, so stolen tokens live forever.",
        "ru": "Три ошибки. Проверка читает `alg` из недоверенного заголовка, поэтому `alg: none` полностью "
        "пропускает проверку подписи. HMAC-секрет это слово из словаря, которое подбирается офлайн. Claims вроде "
        "`exp` не проверяются, поэтому украденные токены живут вечно.",
    },
    fix={
        "en": "Pin the accepted algorithm on the server and never take it from the token, reject `none`. Use a long random "
        "secret (or an asymmetric key) kept out of source control and rotate it. Validate `exp`, `sub` and other "
        "required claims. Prefer a maintained library over hand-written verification.",
        "ru": "Фиксируйте допустимый алгоритм на сервере и никогда не берите его из токена, отклоняйте `none`. "
        "Используйте длинный случайный секрет (или асимметричный ключ) вне репозитория и ротируйте его. Проверяйте "
        "`exp`, `sub` и другие обязательные claims. Предпочитайте поддерживаемую библиотеку самописной проверке.",
    },
    hints=(
        {
            "en": "Log in, then paste the token into the workbench. A JWT is three base64url parts: header, payload, "
            "signature. What does the payload say about your role?",
            "ru": "Войдите и вставьте токен в верстак. JWT состоит из трёх частей base64url: заголовок, нагрузка, "
            "подпись. Что нагрузка говорит о вашей роли?",
        },
        {
            "en": "Way 1: the header contains `alg`. What if you set it to `none` and send an empty signature? "
            "Way 2: the secret is a very common password. Try `secret`, then sign your own payload with it.",
            "ru": "Способ 1: в заголовке есть `alg`. Что, если поставить `none` и отправить пустую подпись? "
            "Способ 2: секрет это очень популярный пароль. Попробуйте `secret` и подпишите им свою нагрузку.",
        },
        {
            "en": "Change `role` to `admin` in the payload. Either re-sign with HS256 and the secret `secret`, or use "
            "`alg: none`. In Fixed mode compare the error messages: unsupported algorithm vs. bad signature.",
            "ru": "Поменяйте `role` на `admin` в нагрузке. Либо подпишите заново HS256 с секретом `secret`, либо "
            "используйте `alg: none`. В защищённом режиме сравните ошибки: неподдерживаемый алгоритм и неверная подпись.",
        },
    ),
    presets=(
        Preset(
            {"en": "Login as alice", "ru": "Вход как alice"},
            "POST", "login", JSON, '{"username": "alice", "password": "wonderland"}',
        ),
        Preset({"en": "Who am I? (paste token)", "ru": "Кто я? (вставьте токен)"}, "GET", "me", BEARER),
        Preset({"en": "Admin area (paste token)", "ru": "Админ-раздел (вставьте токен)"}, "GET", "admin", BEARER),
    ),
    references=(
        Reference("OWASP Top 10:2025: A07 Authentication Failures", "https://top10.owasp.org/2025/"),
        Reference(
            "WSTG: Testing JSON Web Tokens",
            "https://wstg.owasp.org/latest/4-Web_Application_Security_Testing/06-Session_Management/10-JSON_Web_Tokens/",
        ),
        Reference(
            "Cheat Sheet: JSON Web Token",
            "https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html",
        ),
        Reference("RFC 8725: JWT Best Current Practices", "https://www.rfc-editor.org/rfc/rfc8725"),
    ),
)
