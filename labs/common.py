"""Shared helpers for the intentionally vulnerable lab service.

Everything in `labs/` is vulnerable *on purpose* (in `vulnerable` mode). The
code that is shown to the learner lives between `# region vulnerable` /
`# region fixed` markers so the platform can display the code that really runs.
"""

from __future__ import annotations

import re
import textwrap
import threading
from pathlib import Path
from typing import Literal

from fastapi import Request

Mode = Literal["vulnerable", "fixed"]

# Requests sent by the platform's own verifier carry this header, so reference
# exploits never count as the learner solving the challenge.
VERIFIER_HEADER = "x-websec-verifier"

_lock = threading.Lock()
_solved: set[str] = set()  # the learner's attack succeeded against the vulnerable mode
_blocked: set[str] = set()  # the learner repeated the attack and the fixed mode stopped it


def mark_solved(lab_id: str, request: Request) -> None:
    if request.headers.get(VERIFIER_HEADER):
        return
    with _lock:
        _solved.add(lab_id)


def mark_blocked(lab_id: str, request: Request) -> None:
    if request.headers.get(VERIFIER_HEADER):
        return
    with _lock:
        _blocked.add(lab_id)


def is_solved(lab_id: str) -> bool:
    with _lock:
        return lab_id in _solved


def is_blocked(lab_id: str) -> bool:
    with _lock:
        return lab_id in _blocked


def clear_solved() -> None:
    with _lock:
        _solved.clear()
        _blocked.clear()


_REGION = r"^[ \t]*# region {name}\n(.*?)^[ \t]*# endregion\b"


def extract_region(path: Path, name: str) -> str:
    text = path.read_text(encoding="utf-8")
    match = re.search(_REGION.format(name=re.escape(name)), text, re.S | re.M)
    if match is None:
        raise LookupError(f"region {name!r} not found in {path.name}")
    return textwrap.dedent(match.group(1)).rstrip() + "\n"


def source_payload(path: Path) -> dict[str, str]:
    return {
        "file": path.name,
        "language": "python",
        "vulnerable": extract_region(path, "vulnerable"),
        "fixed": extract_region(path, "fixed"),
    }


# --- shared pieces of the two XSS labs --------------------------------------------------
_LAB_JS = """\
(function () {
  var mode = document.documentElement.getAttribute('data-mode');
  window.alert = function (message) {
    try {
      parent.postMessage({ source: 'websec-lab', lab: '__LAB__', mode: mode,
                           type: 'xss-executed', detail: String(message) }, '*');
    } catch (e) {}
    new Image().src = '/__LAB__/' + mode + '/beacon?t=' + Date.now();
  };
})();
"""

_PAGE = """<!doctype html>
<html lang="en" data-mode="{mode}">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="/{lab_id}/static/lab.js"></script>
<style>body{{font:16px system-ui,sans-serif;margin:0;padding:20px;color:#0f172a;background:#fff}}
small{{color:#64748b}}</style>
</head>
<body>
{content}
<p><small>Mode: {mode}</small></p>
</body>
</html>
"""


def lab_js(lab_id: str) -> str:
    """Script that turns alert() into a message to the dashboard plus a beacon request."""
    return _LAB_JS.replace("__LAB__", lab_id)


def render_page(lab_id: str, mode: str, title: str, content: str) -> str:
    return _PAGE.format(lab_id=lab_id, mode=mode, title=title, content=content)
