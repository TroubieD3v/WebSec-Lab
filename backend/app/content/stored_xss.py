from ..catalog import LabDefinition, Preset, Reference

JSON = {"Content-Type": "application/json"}

LAB = LabDefinition(
    id="stored-xss",
    difficulty="medium",
    owasp="A05:2025",
    owasp_name="Injection",
    cwe=("CWE-79",),
    title={"en": "Stored XSS: Guestbook", "ru": "Stored XSS: гостевая книга"},
    summary={
        "en": "Comments are saved as typed and rendered as live HTML for every visitor.",
        "ru": "Комментарии сохраняются как есть и отображаются как живой HTML у каждого посетителя.",
    },
    task={
        "en": "Post a comment that makes `alert(1)` run for whoever opens the guestbook. Check that it keeps "
        "firing on every reload, because the payload is stored. Then switch to Fixed mode and compare.",
        "ru": "Оставьте комментарий, из-за которого `alert(1)` выполняется у каждого, кто открывает гостевую книгу. "
        "Убедитесь, что он срабатывает при каждой перезагрузке, ведь нагрузка сохранена. Затем переключитесь "
        "в защищённый режим и сравните.",
    },
    root_cause={
        "en": "The server stores untrusted text and later writes it into HTML without encoding. Unlike reflected "
        "XSS the victim does not need a crafted link: the attacker's markup is part of the page for everyone, "
        "including the author field.",
        "ru": "Сервер хранит недоверенный текст и позже вставляет его в HTML без кодирования. В отличие от "
        "reflected XSS жертве не нужна специальная ссылка: разметка злоумышленника становится частью страницы "
        "для всех, в том числе через поле автора.",
    },
    fix={
        "en": "Encode on output, for every field and in the right context (HTML-escape here). Do not rely on input "
        "filtering. Add a Content-Security-Policy so injected inline scripts and event handlers cannot run even if "
        "one sink is missed.",
        "ru": "Кодируйте при выводе, для каждого поля и в нужном контексте (здесь HTML-экранирование). Не "
        "полагайтесь на фильтрацию ввода. Добавьте Content-Security-Policy, чтобы внедрённые инлайн-скрипты и "
        "обработчики событий не выполнялись, даже если один из выводов забыли защитить.",
    },
    hints=(
        {
            "en": "Post a normal comment first and look at the guestbook. Then post `<b>bold</b>` as the text.",
            "ru": "Сначала оставьте обычный комментарий и посмотрите гостевую книгу. Затем отправьте "
            "`<b>bold</b>` как текст.",
        },
        {
            "en": "If the text is bold, the browser treats it as HTML. Use an element that fires an event, e.g. "
            "an image that fails to load.",
            "ru": "Если текст стал жирным, браузер воспринимает его как HTML. Используйте элемент с событием, "
            "например изображение, которое не загрузилось.",
        },
        {
            "en": "Post `<img src=x onerror=alert(1)>` as the text. Reload the preview: it fires again. In Fixed "
            "mode, open `/comments` in the Playground: the data is stored the same way, only the output differs.",
            "ru": "Отправьте `<img src=x onerror=alert(1)>` как текст. Обновите предпросмотр: срабатывает снова. "
            "В защищённом режиме откройте `/comments` в Playground: данные хранятся так же, отличается только вывод.",
        },
    ),
    presets=(
        Preset(
            {"en": "Post a comment", "ru": "Отправить комментарий"},
            "POST", "comments", JSON, '{"author": "Eve", "text": "Great shop!"}',
        ),
        Preset(
            {"en": "Post XSS payload", "ru": "Отправить XSS-нагрузку"},
            "POST", "comments", JSON, '{"author": "Eve", "text": "<img src=x onerror=alert(1)>"}',
        ),
        Preset({"en": "List comments (JSON)", "ru": "Список комментариев (JSON)"}, "GET", "comments"),
        Preset({"en": "Rendered page (raw HTML)", "ru": "Страница (исходный HTML)"}, "GET", "page"),
        Preset({"en": "Clear comments", "ru": "Очистить комментарии"}, "DELETE", "comments"),
    ),
    references=(
        Reference("OWASP Top 10:2025: A05 Injection", "https://top10.owasp.org/2025/"),
        Reference(
            "WSTG: Testing for Stored XSS",
            "https://wstg.owasp.org/stable/4-Web_Application_Security_Testing/07-Input_Validation_Testing/02-Testing_for_Stored_Cross_Site_Scripting/",
        ),
        Reference(
            "Cheat Sheet: XSS Prevention",
            "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html",
        ),
        Reference("CWE-79", "https://cwe.mitre.org/data/definitions/79.html"),
    ),
)
