# WebSec Lab: интерактивная площадка по веб-безопасности

[![CI](https://github.com/TroubieD3v/WebSec-Lab/actions/workflows/ci.yml/badge.svg)](https://github.com/TroubieD3v/WebSec-Lab/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-a2a6ae)](LICENSE)
![OWASP Top 10:2025](https://img.shields.io/badge/OWASP%20Top%2010-2025-e8a33d)
![Labs](https://img.shields.io/badge/labs-12-7cc4e8)
![WCAG 2.1 AA](https://img.shields.io/badge/WCAG%202.1-AA-7cc4e8)
![Docker Compose](https://img.shields.io/badge/run%20with-Docker%20Compose-a2a6ae)

[English](README.md) · **Русский**

WebSec Lab это локальная open-source платформа для изучения веб-безопасности на **реальном коде**: вы ломаете
уязвимую реализацию и исправляете её. В каждой лаборатории есть намеренно уязвимая функция, она же с исправлением,
Attack Playground для HTTP-запросов, сравнение кода, подсказки и автоматические проверки, которые *доказывают*, что
уязвимость существует, а защита работает. Ориентиры: OWASP Juice Shop и WebGoat, но с упором на сравнение кода, API и
автопроверки.

По умолчанию интерфейс тёмный, светлая тема включается одной кнопкой (солнце/луна в шапке). Языки: английский и русский.

> **Внимание**: сервис `labs` уязвим намеренно. Запускайте его только на `127.0.0.1` и никогда не открывайте в сеть.
> См. [SECURITY.md](SECURITY.md) и [модель угроз](docs/threat-model.md).

![Взлом в уязвимом режиме, переключение на защищённый, та же атака отклонена](docs/screenshots/demo.gif)

| Дашборд, тёмная тема (по умолчанию) | Дашборд, светлая тема |
|---|---|
| ![Дашборд в тёмной теме](docs/screenshots/dashboard.png) | ![Дашборд в светлой теме](docs/screenshots/dashboard-light.png) |

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

Лаборатория засчитывается, только когда **вы сами**: (1) проэксплуатировали уязвимый режим, (2) отправили ту же атаку
в защищённый режим и увидели, что она заблокирована, (3) запустили автоматическую проверку. Каждый шаг фиксирует
сервер, а не галочка в интерфейсе.

## Быстрый старт (Docker)

```bash
git clone https://github.com/TroubieD3v/WebSec-Lab.git
cd WebSec-Lab
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
ruff check && pytest                    # линтер и 196 тестов: поведение лабораторий и управляющий слой
cd frontend && npm run lint && npm run typecheck
cd tests/e2e && npm install && npx playwright install chromium
npx playwright test                     # 50 браузерных тестов на запущенном стеке, включая аудит WCAG 2.1 AA
```

Подробности: [docs/architecture.md](docs/architecture.md) · [docs/threat-model.md](docs/threat-model.md).

Подробнее: [CONTRIBUTING.md](CONTRIBUTING.md) · [CHANGELOG.md](CHANGELOG.md).
