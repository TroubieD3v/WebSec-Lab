from ..catalog import LabDefinition, Preset, Reference

ALICE = {"Authorization": "Bearer alice-demo-token"}
BOB = {"Authorization": "Bearer bob-demo-token"}

LAB = LabDefinition(
    id="idor",
    difficulty="easy",
    owasp="A01:2025",
    owasp_name="Broken Access Control",
    cwe=("CWE-639", "CWE-284"),
    title={"en": "IDOR: Hotel Bookings", "ru": "IDOR: бронирования отелей"},
    summary={
        "en": "Booking details are returned for any ID without checking who owns the booking.",
        "ru": "Данные бронирования отдаются по любому ID без проверки владельца.",
    },
    task={
        "en": "You are Alice (token `alice-demo-token`); your bookings are 101 and 103. Read a booking that "
        "belongs to Bob. In Fixed mode the same request must be refused.",
        "ru": "Вы Alice (токен `alice-demo-token`), ваши бронирования: 101 и 103. Прочитайте бронирование, "
        "принадлежащее Bob. В защищённом режиме такой же запрос должен быть отклонён.",
    },
    root_cause={
        "en": "The endpoint authenticates the caller but never checks that the requested object belongs to "
        "them. Predictable sequential IDs make enumeration trivial, but hiding IDs would not fix the missing check.",
        "ru": "Эндпоинт аутентифицирует вызывающего, но не проверяет, что запрошенный объект ему принадлежит. "
        "Предсказуемые последовательные ID упрощают перебор, но скрытие ID не заменит отсутствующую проверку.",
    },
    fix={
        "en": "Authorize every object access on the server: compare the object's owner with the authenticated "
        "user (or filter the query by owner). Deny by default. Random IDs are only defence in depth.",
        "ru": "Проверяйте права при каждом обращении к объекту на сервере: сравнивайте владельца объекта с "
        "аутентифицированным пользователем (или фильтруйте запрос по владельцу). Запрет по умолчанию. "
        "Случайные ID лишь дополнительный слой защиты.",
    },
    hints=(
        {
            "en": "Fetch your own booking 101 with Alice's token. Look at the URL: what identifies the object?",
            "ru": "Запросите своё бронирование 101 с токеном Alice. Посмотрите на URL: что идентифицирует объект?",
        },
        {
            "en": "IDs are sequential. Try the neighbouring ID 102 while still authenticated as Alice.",
            "ru": "ID идут подряд. Попробуйте соседний ID 102, оставаясь аутентифицированной как Alice.",
        },
        {
            "en": "Fixed mode compares the booking's owner with the caller and answers 403. "
            "Authentication is not authorization: being logged in does not grant access to every object.",
            "ru": "Защищённый режим сравнивает владельца бронирования с вызывающим и отвечает 403. "
            "Аутентификация — это не авторизация: вход в систему не даёт доступ ко всем объектам.",
        },
    ),
    presets=(
        Preset({"en": "Alice: own booking 101", "ru": "Alice: своё бронирование 101"}, "GET", "bookings/101", ALICE),
        Preset({"en": "Alice: Bob's booking 102", "ru": "Alice: чужое бронирование 102"}, "GET", "bookings/102", ALICE),
        Preset({"en": "Bob: Alice's booking 101", "ru": "Bob: чужое бронирование 101"}, "GET", "bookings/101", BOB),
        Preset({"en": "No token", "ru": "Без токена"}, "GET", "bookings/101"),
    ),
    references=(
        Reference("OWASP Top 10:2025: A01 Broken Access Control", "https://top10.owasp.org/2025/"),
        Reference(
            "WSTG: Testing for IDOR",
            "https://wstg.owasp.org/stable/4-Web_Application_Security_Testing/05-Authorization_Testing/04-Testing_for_Insecure_Direct_Object_References/",
        ),
        Reference(
            "Cheat Sheet: IDOR Prevention",
            "https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html",
        ),
        Reference("CWE-639", "https://cwe.mitre.org/data/definitions/639.html"),
    ),
)
