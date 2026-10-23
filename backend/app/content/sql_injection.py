from ..catalog import LabDefinition, Preset, Reference

LAB = LabDefinition(
    id="sql-injection",
    difficulty="easy",
    owasp="A05:2025",
    owasp_name="Injection",
    cwe=("CWE-89",),
    title={"en": "SQL Injection: Product Search", "ru": "SQL-инъекция: поиск товаров"},
    summary={
        "en": "A product search that builds its SQL query by string concatenation.",
        "ru": "Поиск товаров, который собирает SQL-запрос конкатенацией строк.",
    },
    task={
        "en": "The shop only lists released products. Make the search return the unreleased ones "
        "(Prototype X-9000, Staff Discount Card), then read the users' secrets from another table. "
        "Finally switch to Fixed mode and watch the same input fail.",
        "ru": "Магазин показывает только выпущенные товары. Заставьте поиск вернуть невыпущенные "
        "(Prototype X-9000, Staff Discount Card), затем прочитайте секреты пользователей из другой таблицы. "
        "После этого переключитесь в защищённый режим и убедитесь, что тот же ввод больше не работает.",
    },
    root_cause={
        "en": "User input is concatenated into the SQL text, so the database cannot tell data from code. "
        "A single quote closes the string literal and everything after it is parsed as SQL.",
        "ru": "Пользовательский ввод подставляется прямо в текст SQL, поэтому база не отличает данные от кода. "
        "Одинарная кавычка закрывает строковый литерал, а всё после неё разбирается как SQL.",
    },
    fix={
        "en": "Use parameterized queries. The query structure is compiled first and values are bound "
        "separately, so input can never change the SQL logic. Also give the database account least "
        "privilege and never return raw database errors to the client.",
        "ru": "Используйте параметризованные запросы. Структура запроса компилируется заранее, а значения "
        "передаются отдельно, поэтому ввод не может изменить логику SQL. Дополнительно выдайте учётной записи "
        "БД минимальные права и не возвращайте клиенту сырые ошибки базы данных.",
    },
    hints=(
        {
            "en": "Search for `Laptop Pro`, then add a single quote `'` to the name. What does the server answer?",
            "ru": "Найдите `Laptop Pro`, затем добавьте в название одинарную кавычку `'`. Что отвечает сервер?",
        },
        {
            "en": "The query ends with `AND released = 1`. Turn the rest of the line into a comment with `--`. "
            "Try `' OR 1=1 --`.",
            "ru": "Запрос заканчивается на `AND released = 1`. Превратите остаток строки в комментарий через `--`. "
            "Попробуйте `' OR 1=1 --`.",
        },
        {
            "en": "The result has 4 columns. `UNION SELECT` with 4 columns can read another table; "
            "`sqlite_master` lists table names. Try `' UNION SELECT id, username, secret, 0 FROM users --`.",
            "ru": "В результате 4 столбца. `UNION SELECT` с 4 столбцами читает другую таблицу; "
            "`sqlite_master` содержит имена таблиц. Попробуйте `' UNION SELECT id, username, secret, 0 FROM users --`.",
        },
    ),
    presets=(
        Preset({"en": "Normal search", "ru": "Обычный поиск"}, "GET", "products?name=Laptop%20Pro"),
        Preset({"en": "Single quote (error)", "ru": "Одинарная кавычка (ошибка)"}, "GET", "products?name=%27"),
        Preset({"en": "Bypass filter", "ru": "Обход фильтра"}, "GET", "products?name=%27%20OR%201%3D1%20--"),
        Preset(
            {"en": "UNION: users table", "ru": "UNION: таблица users"},
            "GET",
            "products?name=%27%20UNION%20SELECT%20id%2C%20username%2C%20secret%2C%200%20FROM%20users%20--",
        ),
    ),
    references=(
        Reference("OWASP Top 10:2025: A05 Injection", "https://top10.owasp.org/2025/"),
        Reference(
            "WSTG: Testing for SQL Injection",
            "https://wstg.owasp.org/stable/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05-Testing_for_SQL_Injection/",
        ),
        Reference(
            "Cheat Sheet: SQL Injection Prevention",
            "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html",
        ),
        Reference("CWE-89", "https://cwe.mitre.org/data/definitions/89.html"),
    ),
)
