from ..catalog import LabDefinition, Preset, Reference

LAB = LabDefinition(
    id="xss",
    difficulty="easy",
    owasp="A05:2025",
    owasp_name="Injection",
    cwe=("CWE-79",),
    title={"en": "Reflected XSS: Search Page", "ru": "Reflected XSS: страница поиска"},
    summary={
        "en": "A search page that reflects the query into HTML without escaping it.",
        "ru": "Страница поиска, которая отражает запрос в HTML без экранирования.",
    },
    task={
        "en": "The page echoes your query inside its HTML. Inject markup so that `alert(1)` runs inside the "
        "sandboxed preview. Then switch to Fixed mode and compare the raw responses.",
        "ru": "Страница возвращает ваш запрос внутри HTML. Внедрите разметку так, чтобы `alert(1)` выполнился "
        "в изолированном предпросмотре. Затем переключитесь в защищённый режим и сравните «сырые» ответы.",
    },
    root_cause={
        "en": "The server inserts untrusted text into an HTML context without encoding it, so the browser "
        "parses `<` and `>` from the input as real markup and runs the attacker's script.",
        "ru": "Сервер вставляет недоверенный текст в HTML-контекст без кодирования, поэтому браузер разбирает "
        "`<` и `>` из ввода как настоящую разметку и выполняет скрипт злоумышленника.",
    },
    fix={
        "en": "Encode output for the context it lands in (HTML-escape here). Add Content-Security-Policy as "
        "defence in depth so inline scripts and event handlers cannot run even if escaping is missed, and set "
        "`X-Content-Type-Options: nosniff`.",
        "ru": "Кодируйте вывод под контекст, в который он попадает (здесь HTML-экранирование). Добавьте "
        "Content-Security-Policy как эшелонированную защиту: встроенные скрипты и обработчики событий не "
        "выполнятся, даже если экранирование где-то забыли. Установите `X-Content-Type-Options: nosniff`.",
    },
    hints=(
        {
            "en": "Search for `<b>test</b>`. If it shows up in bold, the browser treats your input as HTML.",
            "ru": "Найдите `<b>test</b>`. Если текст стал жирным, браузер воспринимает ввод как HTML.",
        },
        {
            "en": "Injected `<script>` tags are often blocked or unreliable. An element that fails to load can "
            "fire an event handler such as `onerror` instead.",
            "ru": "Внедрённые теги `<script>` часто блокируются или работают нестабильно. Элемент, который не "
            "загрузился, может вызвать обработчик события, например `onerror`.",
        },
        {
            "en": "Try `<img src=x onerror=alert(1)>`. In Fixed mode, open the response in the Playground and "
            "notice that `<` and `>` became `&lt;` and `&gt;`.",
            "ru": "Попробуйте `<img src=x onerror=alert(1)>`. В защищённом режиме откройте ответ в Playground и "
            "обратите внимание: `<` и `>` превратились в `&lt;` и `&gt;`.",
        },
    ),
    presets=(
        Preset({"en": "Plain text", "ru": "Обычный текст"}, "GET", "search?q=hello"),
        Preset({"en": "HTML injection", "ru": "Внедрение HTML"}, "GET", "search?q=%3Cb%3Ebold%3C%2Fb%3E"),
        Preset(
            {"en": "img onerror payload", "ru": "Нагрузка img onerror"},
            "GET",
            "search?q=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E",
        ),
    ),
    references=(
        Reference("OWASP Top 10:2025: A05 Injection", "https://top10.owasp.org/2025/"),
        Reference(
            "WSTG: Testing for Reflected XSS",
            "https://wstg.owasp.org/stable/4-Web_Application_Security_Testing/07-Input_Validation_Testing/01-Testing_for_Reflected_Cross_Site_Scripting/",
        ),
        Reference(
            "Cheat Sheet: XSS Prevention",
            "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html",
        ),
        Reference("CWE-79", "https://cwe.mitre.org/data/definitions/79.html"),
    ),
)
