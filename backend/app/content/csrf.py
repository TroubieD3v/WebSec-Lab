from ..catalog import LabDefinition, Preset, Reference

JSON = {"Content-Type": "application/json"}

LAB = LabDefinition(
    id="csrf",
    difficulty="medium",
    owasp="A01:2025",
    owasp_name="Broken Access Control",
    cwe=("CWE-352",),
    title={"en": "CSRF: Bank Transfer", "ru": "CSRF: банковский перевод"},
    summary={
        "en": "A state-changing request trusts the session cookie alone, so another site can forge it.",
        "ru": "Изменяющий состояние запрос доверяет одной лишь cookie сессии, поэтому другой сайт может его подделать.",
    },
    task={
        "en": "Alice is logged in to the bank (her browser holds the session cookie). Make her browser send a transfer "
        "to `mallory` without her intent by having her open the attacker's page. Then switch to Fixed mode and see "
        "why the same forged request fails, even when the browser omits the `Origin` header.",
        "ru": "Alice вошла в банк (её браузер хранит cookie сессии). Заставьте её браузер отправить перевод на "
        "`mallory` без её ведома, открыв страницу злоумышленника. Затем переключитесь в защищённый режим и "
        "посмотрите, почему тот же подделанный запрос не проходит, даже если браузер не отправил `Origin`.",
    },
    root_cause={
        "en": "Browsers attach cookies to every request for the bank's domain, whoever triggered it. The endpoint "
        "authenticates by cookie only and cannot tell a click on the bank's own page from a hidden form on "
        "`evil.example`. The lab simulates the victim's browser (cookie attached, real `Origin` and "
        "`Sec-Fetch-Site` headers) so it behaves the same everywhere, and assumes the worst case where the "
        "cookie is sent.",
        "ru": "Браузер прикладывает cookie ко всем запросам на домен банка, кто бы их ни инициировал. Эндпоинт "
        "аутентифицирует только по cookie и не отличает клик на странице банка от скрытой формы на "
        "`evil.example`. Лаборатория эмулирует браузер жертвы (cookie прикладывается, заголовки `Origin` и "
        "`Sec-Fetch-Site` настоящие), поэтому везде работает одинаково и предполагает худший случай: cookie отправляется.",
    },
    fix={
        "en": "Use an anti-CSRF token (synchronizer or double-submit) that a foreign site cannot read, verify "
        "`Origin` / `Sec-Fetch-Site` for state-changing requests, and set `SameSite=Lax` or `Strict` on the "
        "session cookie as an additional layer. Never change state on GET.",
        "ru": "Используйте anti-CSRF токен (synchronizer или double-submit), который чужой сайт прочитать не может, "
        "проверяйте `Origin` / `Sec-Fetch-Site` у изменяющих запросов и ставьте `SameSite=Lax` или `Strict` на "
        "cookie сессии как дополнительный слой. Никогда не меняйте состояние в GET.",
    },
    hints=(
        {
            "en": "Open Alice's account and make a normal transfer to `bob`. Note what the request relies on: only "
            "the session cookie, which the browser adds automatically.",
            "ru": "Откройте счёт Alice и сделайте обычный перевод на `bob`. Обратите внимание, на чём держится "
            "запрос: только на cookie сессии, которую браузер добавляет сам.",
        },
        {
            "en": "The attacker's page cannot read Alice's data, but it can make her browser submit a form. Use the "
            "attacker page to send a transfer to `mallory`.",
            "ru": "Страница злоумышленника не может прочитать данные Alice, но может заставить её браузер "
            "отправить форму. Отправьте через неё перевод на `mallory`.",
        },
        {
            "en": "In Fixed mode two things differ: the bank checks where the request came from, and it requires an "
            "`X-CSRF-Token` that only the bank's own page knows. Try the attack with browser headers stripped to see "
            "the token alone stop it.",
            "ru": "В защищённом режиме отличаются две вещи: банк проверяет источник запроса и требует "
            "`X-CSRF-Token`, известный только странице самого банка. Повторите атаку без заголовков браузера, "
            "чтобы увидеть, как токен останавливает её сам по себе.",
        },
    ),
    presets=(
        Preset({"en": "Alice opens her account", "ru": "Alice открывает счёт"}, "GET", "browser/account"),
        Preset(
            {"en": "Alice transfers to Bob (legit)", "ru": "Alice переводит Bob (легитимно)"},
            "POST", "browser/transfer", JSON, '{"to": "bob", "amount": 50}',
        ),
        Preset(
            {"en": "Alice visits the attacker page", "ru": "Alice открывает страницу злоумышленника"},
            "POST", "browser/visit-attacker-page", JSON, '{"to": "mallory", "amount": 500}',
        ),
        Preset(
            {"en": "Attacker page, no Origin header", "ru": "Страница злоумышленника, без Origin"},
            "POST", "browser/visit-attacker-page", JSON, '{"to": "mallory", "amount": 500, "strip_headers": true}',
        ),
    ),
    references=(
        Reference("OWASP Top 10:2025: A01 Broken Access Control", "https://top10.owasp.org/2025/"),
        Reference(
            "WSTG: Testing for CSRF",
            "https://wstg.owasp.org/stable/4-Web_Application_Security_Testing/06-Session_Management_Testing/05-Testing_for_Cross_Site_Request_Forgery/",
        ),
        Reference(
            "Cheat Sheet: CSRF Prevention",
            "https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html",
        ),
        Reference("CWE-352", "https://cwe.mitre.org/data/definitions/352.html"),
    ),
)
