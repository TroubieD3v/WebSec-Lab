from ..catalog import LabDefinition, Preset, Reference

JSON = {"Content-Type": "application/json"}
LOGIN = '{"username": "alice", "password": "sunshine"}'

LAB = LabDefinition(
    id="broken-auth",
    difficulty="medium",
    owasp="A07:2025",
    owasp_name="Authentication Failures",
    cwe=("CWE-307", "CWE-613", "CWE-204", "CWE-330"),
    title={"en": "Broken Authentication: Login & Sessions", "ru": "Broken Authentication: вход и сессии"},
    summary={
        "en": "Unlimited login attempts, user enumeration, predictable tokens and a logout that does nothing.",
        "ru": "Неограниченные попытки входа, перечисление пользователей, предсказуемые токены и «пустой» logout.",
    },
    task={
        "en": "Account `alice` has a weak password. Recover it by guessing (the endpoint must not allow that), "
        "and show that a session token keeps working after logout. Then compare with Fixed mode: lockout, "
        "generic errors, random tokens and a real logout.",
        "ru": "У аккаунта `alice` слабый пароль. Подберите его (эндпоинт не должен этого позволять) и покажите, "
        "что токен сессии продолжает работать после выхода. Затем сравните с защищённым режимом: блокировка, "
        "одинаковые ошибки, случайные токены и настоящий logout.",
    },
    root_cause={
        "en": "There is no limit on failed attempts, error messages reveal which usernames exist, session "
        "tokens are sequential and guessable, and logout never invalidates the server-side session.",
        "ru": "Число неудачных попыток не ограничено, сообщения об ошибках раскрывают существующие имена, "
        "токены сессий последовательны и угадываются, а logout не аннулирует серверную сессию.",
    },
    fix={
        "en": "Throttle or temporarily lock after repeated failures (and watch for lockout abuse), return one "
        "generic error, hash passwords with a slow salted function, generate tokens with a CSPRNG, expire "
        "sessions and destroy them on logout.",
        "ru": "Ограничивайте или временно блокируйте вход после серии неудач (учитывая риск блокировки чужих "
        "аккаунтов), возвращайте единое сообщение об ошибке, хэшируйте пароли медленной функцией с солью, "
        "генерируйте токены криптостойким ГСЧ, задавайте срок жизни сессий и уничтожайте их при выходе.",
    },
    hints=(
        {
            "en": "Compare the response for an unknown user with the response for `alice` and a wrong password. "
            "Do they differ?",
            "ru": "Сравните ответ для несуществующего пользователя и для `alice` с неверным паролем. "
            "Они отличаются?",
        },
        {
            "en": "Try guesses from a short list of common passwords. Does the server ever slow you down or "
            "lock the account? The Try it tab has a small wordlist runner.",
            "ru": "Перебирайте пароли из короткого списка популярных. Замедляет ли сервер вас или блокирует "
            "аккаунт? На вкладке Try it есть простой перебор по словарю.",
        },
        {
            "en": "Log in, call `/me`, log out, then call `/me` with the OLD token again. Also compare two "
            "consecutive tokens: do you see a pattern?",
            "ru": "Войдите, вызовите `/me`, выйдите и снова вызовите `/me` со СТАРЫМ токеном. Сравните два "
            "последовательных токена: заметна ли закономерность?",
        },
    ),
    presets=(
        Preset({"en": "Login as alice", "ru": "Вход как alice"}, "POST", "login", JSON, LOGIN),
        Preset(
            {"en": "Login: unknown user", "ru": "Вход: неизвестный пользователь"},
            "POST",
            "login",
            JSON,
            '{"username": "nobody", "password": "x"}',
        ),
        Preset(
            {"en": "Login: wrong password", "ru": "Вход: неверный пароль"},
            "POST",
            "login",
            JSON,
            '{"username": "alice", "password": "wrong"}',
        ),
        Preset(
            {"en": "Who am I? (paste token)", "ru": "Кто я? (вставьте токен)"},
            "GET",
            "me",
            {"Authorization": "Bearer PASTE_TOKEN_HERE"},
        ),
        Preset(
            {"en": "Logout (paste token)", "ru": "Выход (вставьте токен)"},
            "POST",
            "logout",
            {"Authorization": "Bearer PASTE_TOKEN_HERE"},
        ),
    ),
    references=(
        Reference("OWASP Top 10:2025: A07 Authentication Failures", "https://top10.owasp.org/2025/"),
        Reference(
            "WSTG: Testing for Weak Lock Out Mechanism",
            "https://wstg.owasp.org/stable/4-Web_Application_Security_Testing/04-Authentication_Testing/03-Testing_for_Weak_Lock_Out_Mechanism/",
        ),
        Reference(
            "WSTG: Testing for Logout Functionality",
            "https://wstg.owasp.org/stable/4-Web_Application_Security_Testing/06-Session_Management_Testing/06-Testing_for_Logout_Functionality/",
        ),
        Reference(
            "Cheat Sheet: Authentication",
            "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html",
        ),
        Reference(
            "Cheat Sheet: Session Management",
            "https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html",
        ),
    ),
)
