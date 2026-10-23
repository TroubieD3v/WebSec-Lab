from ..catalog import LabDefinition, Preset, Reference

JSON = {"Content-Type": "application/json"}

LAB = LabDefinition(
    id="race-condition",
    difficulty="hard",
    owasp="A06:2025",
    owasp_name="Insecure Design",
    cwe=("CWE-362", "CWE-367"),
    title={"en": "Race Condition: Single-use Coupon", "ru": "Race Condition: одноразовый купон"},
    summary={
        "en": "A single-use coupon is checked and recorded in two steps, so parallel requests all pass the check.",
        "ru": "Одноразовый купон проверяется и фиксируется в два шага, поэтому параллельные запросы проходят проверку все.",
    },
    task={
        "en": "The coupon `WELCOME10` adds 10 credits and may be used once. Redeem it a single time, confirm a second "
        "attempt is refused, then send many requests at the same instant and see how many credits you get. Fixed "
        "mode must grant exactly 10.",
        "ru": "Купон `WELCOME10` добавляет 10 кредитов и применяется один раз. Примените его один раз, убедитесь, "
        "что повторная попытка отклоняется, затем отправьте много запросов одновременно и посмотрите, сколько "
        "кредитов получится. Защищённый режим должен выдать ровно 10.",
    },
    root_cause={
        "en": "Time-of-check to time-of-use: the handler asks \"already redeemed?\", then does slow work (a database "
        "round trip), and only afterwards records the redemption. Requests that arrive within that window all "
        "see \"not redeemed\". Sequential tests never find it.",
        "ru": "Разрыв между проверкой и использованием (TOCTOU): обработчик спрашивает «уже применён?», затем "
        "делает медленную работу (обращение к БД) и только потом фиксирует применение. Запросы, пришедшие в это "
        "окно, все видят «не применён». Последовательные тесты это не находят.",
    },
    fix={
        "en": "Make check-and-claim one atomic step: a lock in a single process, but in real systems a database unique "
        "constraint, an atomic `UPDATE ... WHERE used = false` or a transaction with the right isolation level. "
        "Idempotency keys help too.",
        "ru": "Сделайте проверку и захват одним атомарным шагом: блокировка в одном процессе, а в реальных системах "
        "уникальный индекс в БД, атомарный `UPDATE ... WHERE used = false` или транзакция с нужным уровнем "
        "изоляции. Помогают и ключи идемпотентности.",
    },
    hints=(
        {
            "en": "Redeem the coupon once, then again. The second attempt is refused with 409, so the rule exists. When is it enforced?",
            "ru": "Примените купон один раз, затем ещё раз. Повтор отклоняется с 409, значит правило есть. Когда оно проверяется?",
        },
        {
            "en": "Between the check and the update the server waits for a slow operation. What if many requests arrive "
            "during that wait?",
            "ru": "Между проверкой и обновлением сервер ждёт медленную операцию. Что, если за это время придёт много запросов?",
        },
        {
            "en": "Use the burst button to send 10 requests simultaneously. In Fixed mode exactly one succeeds and the "
            "rest get 409.",
            "ru": "Нажмите кнопку «пачка», чтобы отправить 10 запросов одновременно. В защищённом режиме успешен ровно "
            "один, остальные получают 409.",
        },
    ),
    presets=(
        Preset({"en": "Wallet", "ru": "Кошелёк"}, "GET", "wallet"),
        Preset({"en": "Redeem coupon", "ru": "Применить купон"}, "POST", "redeem", JSON, '{"code": "WELCOME10"}'),
    ),
    references=(
        Reference("OWASP Top 10:2025: A06 Insecure Design", "https://top10.owasp.org/2025/"),
        Reference(
            "WSTG: Test for Process Timing",
            "https://wstg.owasp.org/stable/4-Web_Application_Security_Testing/10-Business_Logic_Testing/04-Test_for_Process_Timing/",
        ),
        Reference("CWE-362: Race Condition", "https://cwe.mitre.org/data/definitions/362.html"),
        Reference("CWE-367: TOCTOU", "https://cwe.mitre.org/data/definitions/367.html"),
    ),
)
