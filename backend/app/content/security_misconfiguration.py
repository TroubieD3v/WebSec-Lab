from ..catalog import LabDefinition, Preset, Reference

LAB = LabDefinition(
    id="security-misconfiguration",
    difficulty="easy",
    owasp="A02:2025",
    owasp_name="Security Misconfiguration",
    cwe=("CWE-489", "CWE-209", "CWE-693", "CWE-200"),
    title={"en": "Security Misconfiguration: Shop API", "ru": "Security Misconfiguration: API магазина"},
    summary={
        "en": "A debug endpoint with secrets, stack traces in errors, and missing security headers.",
        "ru": "Debug-эндпоинт с секретами, стек-трейсы в ошибках и отсутствие заголовков безопасности.",
    },
    task={
        "en": "Nothing here needs a clever payload, only curiosity. Find a leftover debug endpoint that exposes "
        "secrets, make the API print an internal stack trace, and inspect the response headers for missing "
        "protections and technology banners. Then compare with Fixed mode.",
        "ru": "Здесь не нужна хитрая нагрузка, достаточно любопытства. Найдите забытый debug-эндпоинт с секретами, "
        "заставьте API вывести внутренний стек-трейс и изучите заголовки ответа: каких защит нет и что "
        "раскрывает версии технологий. Затем сравните с защищённым режимом.",
    },
    root_cause={
        "en": "Defaults and development conveniences reached production: a debug route that dumps configuration, "
        "an error handler that returns exception details and file paths, and no hardening headers while "
        "advertising the exact framework version. Each leak makes the next attack cheaper.",
        "ru": "Настройки по умолчанию и удобства разработки попали в продакшн: debug-маршрут, выдающий "
        "конфигурацию; обработчик ошибок, возвращающий детали исключения и пути к файлам; нет защитных заголовков, "
        "зато указана точная версия фреймворка. Каждая утечка удешевляет следующую атаку.",
    },
    fix={
        "en": "Disable or remove debug endpoints outside development. Log details server-side and return a generic "
        "error with an incident id. Send hardening headers (`X-Content-Type-Options`, `X-Frame-Options`, "
        "`Content-Security-Policy`, `Referrer-Policy`) and drop version banners. Keep configuration reviewed and "
        "identical across environments.",
        "ru": "Отключайте или удаляйте debug-эндпоинты вне разработки. Детали пишите в серверный лог, клиенту "
        "возвращайте общую ошибку с идентификатором инцидента. Отправляйте защитные заголовки "
        "(`X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, `Referrer-Policy`) и убирайте "
        "баннеры версий. Проверяйте конфигурацию и держите её согласованной между окружениями.",
    },
    hints=(
        {
            "en": "Inspect the headers of `GET /ping`. What does the server tell you about itself, and which "
            "protective headers are absent?",
            "ru": "Изучите заголовки ответа `GET /ping`. Что сервер сообщает о себе и каких защитных заголовков нет?",
        },
        {
            "en": "Orders are fetched by number. What happens if the reference is not a number, e.g. `/orders/abc`?",
            "ru": "Заказы запрашиваются по номеру. Что произойдёт, если ссылка не число, например `/orders/abc`?",
        },
        {
            "en": "Developers often leave routes like `/debug/config` behind. Try it. In Fixed mode the route "
            "is simply a `404`.",
            "ru": "Разработчики часто забывают маршруты вроде `/debug/config`. Попробуйте. В защищённом режиме "
            "маршрут просто возвращает `404`.",
        },
    ),
    presets=(
        Preset({"en": "Valid order", "ru": "Корректный заказ"}, "GET", "orders/1001"),
        Preset({"en": "Invalid order ref (error)", "ru": "Некорректный номер (ошибка)"}, "GET", "orders/abc"),
        Preset({"en": "Debug config", "ru": "Debug-конфигурация"}, "GET", "debug/config"),
        Preset({"en": "Ping (inspect headers)", "ru": "Ping (смотрим заголовки)"}, "GET", "ping"),
    ),
    references=(
        Reference("OWASP Top 10:2025: A02 Security Misconfiguration", "https://top10.owasp.org/2025/"),
        Reference(
            "WSTG: Configuration and Deployment Management Testing",
            "https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/",
        ),
        Reference(
            "OWASP Secure Headers Project",
            "https://owasp.org/www-project-secure-headers/",
        ),
        Reference("CWE-209: Error message with sensitive information", "https://cwe.mitre.org/data/definitions/209.html"),
    ),
)
