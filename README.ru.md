# WebSec Lab: интерактивная площадка по веб-безопасности

[English](README.md) · **Русский**

WebSec Lab это локальная open-source платформа для изучения веб-безопасности на **реальном коде**: вы ломаете
уязвимую реализацию и исправляете её. В каждой лаборатории есть намеренно уязвимая функция, она же с исправлением,
Attack Playground для HTTP-запросов, сравнение кода, подсказки и автоматические проверки, которые *доказывают*, что
уязвимость существует, а защита работает. Ориентиры: OWASP Juice Shop и WebGoat, но с упором на сравнение кода, API и
автопроверки.

> **Внимание**: сервис `labs` уязвим намеренно. Запускайте его только на `127.0.0.1` и никогда не открывайте в сеть.
> См. [SECURITY.md](SECURITY.md) и [модель угроз](docs/threat-model.md).

## Лаборатории

| Лаборатория | Что показывает | OWASP Top 10:2025 | Сложность |
|---|---|---|---|
| SQL Injection | Конкатенация SQL и параметризованные запросы | A05 Injection | Easy |
| Reflected XSS | Неэкранированный вывод и кодирование + CSP, выполнение в sandbox-iframe | A05 Injection | Easy |
| Stored XSS | Сохранённая нагрузка срабатывает у каждого посетителя; кодирование при выводе + CSP | A05 Injection | Medium |
| IDOR | Чтение чужих бронирований и проверка владельца | A01 Broken Access Control | Easy |
| Broken Access Control | Админский API доступен пользователям, повышение прав через mass assignment | A01 Broken Access Control | Medium |
| CSRF | Подделанный межсайтовый перевод и anti-CSRF токен + проверки `Origin` / `Sec-Fetch-Site` | A01 Broken Access Control | Medium |
| Path Traversal | `../` и абсолютные пути выходят за папку; проверка итогового пути (эмулированная ФС в памяти) | A01 Broken Access Control | Medium |
| Security Misconfiguration | Debug-эндпоинт с секретами, стек-трейсы, нет заголовков безопасности | A02 Security Misconfiguration | Easy |
| File Upload | HTML/SVG отдаются как активное содержимое; белый список, магические байты, случайные имена | A06 Insecure Design | Medium |
| Race Condition | Одноразовый купон применяется много раз параллельными запросами; атомарная проверка и захват | A06 Insecure Design | Hard |
| Broken Authentication | Нет блокировки, перечисление пользователей, предсказуемые токены, «пустой» logout | A07 Authentication Failures | Medium |
| JWT Misconfiguration | `alg: none`, угадываемый секрет и игнорируемый срок жизни; закреплённый алгоритм и проверка claims | A07 Authentication Failures | Hard |

В каждой лаборатории: уязвимый и защищённый режимы, Attack Playground, Code Diff из реально исполняемого кода,
три подсказки, автоматическая проверка и прогресс. Интерфейс переключается между русским и английским.

## Быстрый старт (Docker)

```bash
docker compose up --build
```

Откройте <http://127.0.0.1:3000> (или `localhost:3000`). Порты `3000` и `8081` привязаны только к loopback-интерфейсу. Прогресс хранится в Docker-томе `progress`; `docker compose down --volumes` удаляет его.

## Локальная разработка (без Docker)

Три процесса, каждый в своём терминале из корня репозитория:

```bash
# 1. Сервис уязвимых лабораторий (порт 8081)
python -m venv .venv && . .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r backend/requirements-dev.txt -r labs/requirements.txt
cd labs && uvicorn main:app --host 127.0.0.1 --port 8081

# 2. API управляющего слоя (порт 8000)
cd backend && uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000

# 3. Интерфейс (порт 3000, проксирует /api на :8000)
cd frontend && npm install && npm run dev
```

## Тесты

```bash
pytest                                  # 191 тест: поведение лабораторий и управляющий слой
cd frontend && npm run typecheck        # TypeScript
cd tests/e2e && npm install && npx playwright install chromium
npx playwright test                     # 43 браузерных теста на запущенном стеке
```

Подробности: [docs/architecture.md](docs/architecture.md) · [docs/threat-model.md](docs/threat-model.md).

Подробнее: [CONTRIBUTING.md](CONTRIBUTING.md) · [CHANGELOG.md](CHANGELOG.md).
