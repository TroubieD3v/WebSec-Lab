from ..catalog import LabDefinition, Preset, Reference

LAB = LabDefinition(
    id="file-upload",
    difficulty="medium",
    owasp="A06:2025",
    owasp_name="Insecure Design",
    cwe=("CWE-434", "CWE-79", "CWE-73"),
    title={"en": "File Upload: Avatars", "ru": "Загрузка файлов: аватары"},
    summary={
        "en": "Any file is accepted and served back with the content type the uploader chose.",
        "ru": "Принимается любой файл, и отдаётся он с тем content type, который выбрал загрузивший.",
    },
    task={
        "en": "The avatar uploader should accept images. Upload an HTML file instead and make the server serve it as "
        "active content, so the script in it runs in the lab origin (the preview is a sandboxed iframe). In Fixed "
        "mode, try several disguises. Files live in memory; nothing is saved to disk or executed on the server.",
        "ru": "Загрузчик аватаров должен принимать изображения. Загрузите вместо этого HTML-файл и заставьте сервер "
        "отдать его как активное содержимое, чтобы скрипт выполнился в origin лаборатории (предпросмотр это "
        "iframe в песочнице). В защищённом режиме попробуйте несколько маскировок. Файлы хранятся в памяти: "
        "на диск ничего не пишется, на сервере ничего не выполняется.",
    },
    root_cause={
        "en": "The server trusts what the client says: the file name, the extension and the `Content-Type`. It stores "
        "the file under the client's name and serves it back with the client's type, so an HTML or SVG file "
        "becomes a page on your origin and its script can act on behalf of your users.",
        "ru": "Сервер верит тому, что говорит клиент: имени файла, расширению и `Content-Type`. Он сохраняет файл "
        "под именем клиента и отдаёт с типом клиента, поэтому HTML или SVG становится страницей на вашем origin, "
        "а его скрипт действует от имени ваших пользователей.",
    },
    fix={
        "en": "Allow-list the extensions you need and verify the real content (magic bytes), cap the size, store under a "
        "random server-generated name, and serve with the type you determined, plus `X-Content-Type-Options: nosniff`, "
        "`Content-Disposition: attachment` and a restrictive CSP. Better still, serve user uploads from a separate "
        "domain.",
        "ru": "Разрешайте только нужные расширения и проверяйте реальное содержимое (магические байты), ограничивайте "
        "размер, сохраняйте под случайным именем, сгенерированным сервером, и отдавайте с определённым вами типом "
        "плюс `X-Content-Type-Options: nosniff`, `Content-Disposition: attachment` и строгая CSP. Ещё лучше "
        "отдавать пользовательские файлы с отдельного домена.",
    },
    hints=(
        {
            "en": "Upload a normal image first and look at the response: the file name and URL come from you.",
            "ru": "Сначала загрузите обычное изображение и посмотрите ответ: имя файла и URL зависят от вас.",
        },
        {
            "en": "Name a file `avatar.html` and set its type to `text/html`. The server never asks what is inside.",
            "ru": "Назовите файл `avatar.html` и укажите тип `text/html`. Сервер не интересуется содержимым.",
        },
        {
            "en": "In Fixed mode try `avatar.png` containing HTML (a polyglot) and `avatar.png.html`: the extension "
            "allow-list and magic-byte check both refuse them. Uploaded names are replaced by random ones.",
            "ru": "В защищённом режиме попробуйте `avatar.png` с HTML внутри (полиглот) и `avatar.png.html`: белый "
            "список расширений и проверка магических байтов отклонят оба. Имена заменяются случайными.",
        },
    ),
    presets=(
        Preset(
            {"en": "List uploaded files", "ru": "Список загруженных файлов"},
            "GET", "files",
        ),
    ),
    references=(
        Reference("OWASP Top 10:2025: A06 Insecure Design", "https://top10.owasp.org/2025/"),
        Reference(
            "WSTG: Test Upload of Unexpected File Types",
            "https://wstg.owasp.org/stable/4-Web_Application_Security_Testing/10-Business_Logic_Testing/08-Test_Upload_of_Unexpected_File_Types/",
        ),
        Reference(
            "Cheat Sheet: File Upload",
            "https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html",
        ),
        Reference("CWE-434", "https://cwe.mitre.org/data/definitions/434.html"),
    ),
)
