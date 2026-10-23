from ..catalog import LabDefinition, Preset, Reference

ALICE = {"Authorization": "Bearer alice-demo-token"}
ADMIN = {"Authorization": "Bearer admin-demo-token"}
JSON = {"Content-Type": "application/json", **ALICE}

LAB = LabDefinition(
    id="broken-access-control",
    difficulty="medium",
    owasp="A01:2025",
    owasp_name="Broken Access Control",
    cwe=("CWE-285", "CWE-915"),
    title={"en": "Broken Access Control: Admin Functions", "ru": "Broken Access Control: функции администратора"},
    summary={
        "en": "A regular user reaches the admin API and promotes themselves through mass assignment.",
        "ru": "Обычный пользователь попадает в админский API и сам повышает себе права через mass assignment.",
    },
    task={
        "en": "You are Alice, a regular user (token `alice-demo-token`). The admin panel is not linked from your UI, "
        "but is it really protected? Read the admin user list, then try to make yourself an administrator "
        "through your own profile. In Fixed mode both attempts must fail.",
        "ru": "Вы Alice, обычный пользователь (токен `alice-demo-token`). Админ-панель не показана в вашем "
        "интерфейсе, но защищена ли она на самом деле? Прочитайте список пользователей админки, затем попробуйте "
        "сделать себя администратором через свой профиль. В защищённом режиме обе попытки должны провалиться.",
    },
    root_cause={
        "en": "Two missing server-side checks. The admin endpoint verifies that the caller is logged in but not that "
        "they are an admin (function-level access control). The profile endpoint copies every submitted JSON field "
        "onto the user record, including `role` (mass assignment). Hiding a link in the UI protects nothing.",
        "ru": "Две пропущенные проверки на сервере. Админский эндпоинт проверяет, что пользователь вошёл, но не что он "
        "администратор (контроль доступа на уровне функции). Эндпоинт профиля копирует все присланные поля JSON в "
        "запись пользователя, включая `role` (mass assignment). Скрытая ссылка в интерфейсе ничего не защищает.",
    },
    fix={
        "en": "Enforce the role on the server for every privileged function, deny by default. Accept only an "
        "allow-list of editable fields and reject or ignore the rest; never bind request bodies directly to "
        "persistent models.",
        "ru": "Проверяйте роль на сервере для каждой привилегированной функции, запрет по умолчанию. Принимайте "
        "только белый список редактируемых полей, остальные отклоняйте или игнорируйте; никогда не связывайте тело "
        "запроса напрямую с моделью хранилища.",
    },
    hints=(
        {
            "en": "Call `GET /me` as Alice to see your role, then call `GET /admin/users` with the same token.",
            "ru": "Вызовите `GET /me` как Alice, чтобы увидеть свою роль, затем `GET /admin/users` с тем же токеном.",
        },
        {
            "en": "Look at the profile JSON the API returns. Which fields could the server be copying from your "
            "request? Add one that is not in the form.",
            "ru": "Посмотрите на JSON профиля, который возвращает API. Какие поля сервер может копировать из вашего "
            "запроса? Добавьте то, которого нет в форме.",
        },
        {
            "en": "Send `PATCH /profile` with `{\"role\": \"admin\"}`. In Fixed mode compare the status codes: `400` "
            "for the forbidden field and `403` for the admin list.",
            "ru": "Отправьте `PATCH /profile` с `{\"role\": \"admin\"}`. В защищённом режиме сравните коды: `400` для "
            "запрещённого поля и `403` для списка администратора.",
        },
    ),
    presets=(
        Preset({"en": "Alice: who am I?", "ru": "Alice: кто я?"}, "GET", "me", ALICE),
        Preset({"en": "Alice: admin user list", "ru": "Alice: список админки"}, "GET", "admin/users", ALICE),
        Preset(
            {"en": "Alice: rename (allowed)", "ru": "Alice: смена имени (разрешено)"},
            "PATCH", "profile", JSON, '{"display_name": "Ally"}',
        ),
        Preset(
            {"en": "Alice: set role=admin", "ru": "Alice: назначить себе role=admin"},
            "PATCH", "profile", JSON, '{"role": "admin"}',
        ),
        Preset({"en": "Admin: user list", "ru": "Админ: список пользователей"}, "GET", "admin/users", ADMIN),
    ),
    references=(
        Reference("OWASP Top 10:2025: A01 Broken Access Control", "https://top10.owasp.org/2025/"),
        Reference(
            "WSTG: Testing for Privilege Escalation",
            "https://wstg.owasp.org/stable/4-Web_Application_Security_Testing/05-Authorization_Testing/03-Testing_for_Privilege_Escalation/",
        ),
        Reference(
            "Cheat Sheet: Authorization",
            "https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html",
        ),
        Reference(
            "Cheat Sheet: Mass Assignment",
            "https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html",
        ),
        Reference("CWE-285", "https://cwe.mitre.org/data/definitions/285.html"),
    ),
)
