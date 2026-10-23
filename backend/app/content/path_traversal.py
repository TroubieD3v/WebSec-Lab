from ..catalog import LabDefinition, Preset, Reference

LAB = LabDefinition(
    id="path-traversal",
    difficulty="medium",
    owasp="A01:2025",
    owasp_name="Broken Access Control",
    cwe=("CWE-22", "CWE-23", "CWE-36"),
    title={"en": "Path Traversal: Document Viewer", "ru": "Path Traversal: просмотр документов"},
    summary={
        "en": "A file endpoint joins user input to a base folder without checking where the result lands.",
        "ru": "Эндпоинт файлов присоединяет ввод пользователя к базовой папке, не проверяя, куда указывает результат.",
    },
    task={
        "en": "The viewer serves documents from `/srv/app/public/docs`. Read the application's config file "
        "`/srv/app/config/app.env`, then the system file `/etc/passwd`. In Fixed mode every escape attempt "
        "must be refused. The file system is simulated in memory: no real file on your machine is read.",
        "ru": "Просмотрщик отдаёт документы из `/srv/app/public/docs`. Прочитайте конфигурацию приложения "
        "`/srv/app/config/app.env`, затем системный файл `/etc/passwd`. В защищённом режиме любая попытка "
        "выйти за папку должна отклоняться. Файловая система эмулируется в памяти: реальные файлы на вашем "
        "компьютере не читаются.",
    },
    root_cause={
        "en": "The handler builds a path with `join` and `normpath` and uses it without verifying that the result is "
        "still inside the documents folder. `..` segments climb out of it, and an absolute name makes `join` "
        "discard the base entirely.",
        "ru": "Обработчик собирает путь через `join` и `normpath` и использует его, не проверив, что результат "
        "остался внутри папки документов. Сегменты `..` выводят за её пределы, а абсолютное имя заставляет `join` "
        "полностью отбросить базовую папку.",
    },
    fix={
        "en": "Resolve the final path and verify it is inside the allowed root (`commonpath` here, or "
        "`Path.resolve()` plus `is_relative_to` on a real file system); reject NUL bytes. Better still, map "
        "public identifiers to files with an allow-list instead of accepting paths at all, and run the "
        "process with minimal file-system permissions.",
        "ru": "Вычислите итоговый путь и проверьте, что он внутри разрешённого корня (здесь `commonpath`, а на "
        "настоящей ФС `Path.resolve()` и `is_relative_to`); отклоняйте NUL-байты. Ещё лучше сопоставлять публичные "
        "идентификаторы файлам по белому списку, а не принимать пути, и запускать процесс с минимальными правами "
        "на файловую систему.",
    },
    hints=(
        {
            "en": "Open `welcome.txt` and look at the `resolved` path in the response. The name is joined to a base "
            "folder, so what happens with `..`?",
            "ru": "Откройте `welcome.txt` и посмотрите на поле `resolved` в ответе. Имя присоединяется к базовой "
            "папке, так что что будет с `..`?",
        },
        {
            "en": "The base is `/srv/app/public/docs`. How many `../` do you need to reach `/srv/app`, then `config/app.env`?",
            "ru": "База: `/srv/app/public/docs`. Сколько `../` нужно, чтобы подняться до `/srv/app`, а затем "
            "дойти до `config/app.env`?",
        },
        {
            "en": "Try `../../config/app.env`. Then try an absolute name: `/etc/passwd`. In Fixed mode both "
            "return `403` because the resolved path leaves the documents folder.",
            "ru": "Попробуйте `../../config/app.env`. Затем абсолютное имя: `/etc/passwd`. В защищённом режиме "
            "оба вернут `403`, потому что итоговый путь выходит за папку документов.",
        },
    ),
    presets=(
        Preset({"en": "Normal document", "ru": "Обычный документ"}, "GET", "files?name=welcome.txt"),
        Preset({"en": "Nested document", "ru": "Вложенный документ"}, "GET", "files?name=guides/start.txt"),
        Preset({"en": "Climb out: app.env", "ru": "Выход наверх: app.env"}, "GET", "files?name=..%2F..%2Fconfig%2Fapp.env"),
        Preset({"en": "Absolute path: /etc/passwd", "ru": "Абсолютный путь: /etc/passwd"}, "GET", "files?name=%2Fetc%2Fpasswd"),
    ),
    references=(
        Reference("OWASP Top 10:2025: A01 Broken Access Control", "https://top10.owasp.org/2025/"),
        Reference(
            "WSTG: Testing Directory Traversal / File Include",
            "https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/05-Authorization_Testing/01-Testing_Directory_Traversal_File_Include",
        ),
        Reference("OWASP: Path Traversal", "https://owasp.org/www-community/attacks/Path_Traversal"),
        Reference("CWE-22", "https://cwe.mitre.org/data/definitions/22.html"),
    ),
)
