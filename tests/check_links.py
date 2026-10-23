"""Check that every reference URL in the lab content still resolves.

    python tests/check_links.py

Reads the URLs from backend/app/content/*.py and requests each one (standard library only).
Exit code 1 when a link is broken. Not part of the default CI run because it needs the internet
and third-party sites are occasionally flaky; run it before a release.
"""

from __future__ import annotations

import re
import sys
import threading
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlsplit

CONTENT = Path(__file__).resolve().parent.parent / "backend" / "app" / "content"
URL = re.compile(r'Reference\(\s*(?:"[^"]*"|\'[^\']*\')\s*,\s*\n?\s*"(https?://[^"]+)"', re.S)
HEADERS = {"User-Agent": "websec-lab-link-check/1.0 (+https://github.com/TroubieD3v/websec-lab)"}
TIMEOUT = 10
# Hosts that gave no HTTP answer at all; their other links are not waited on (a blocked host would
# otherwise cost a full timeout per link and look like a hang).
DOWN: set[str] = set()
DOWN_LOCK = threading.Lock()


def urls() -> dict[str, list[str]]:
    found: dict[str, list[str]] = {}
    for path in sorted(CONTENT.glob("*.py")):
        for url in URL.findall(path.read_text(encoding="utf-8")):
            found.setdefault(url, []).append(path.stem)
    return found


def check(url: str) -> tuple[str, int | str, str]:
    host = urlsplit(url).hostname or ""
    with DOWN_LOCK:
        if host in DOWN:
            return url, "error: host unreachable (skipped)", ""
    for method in ("HEAD", "GET"):  # some sites reject HEAD
        request = urllib.request.Request(url, method=method, headers=HEADERS)
        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
                return url, response.status, response.geturl()
        except urllib.error.HTTPError as error:
            if method == "GET" or error.code not in (403, 405, 501):
                return url, error.code, ""
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            with DOWN_LOCK:
                DOWN.add(host)
            return url, f"error: {error}", ""
    return url, "unknown", ""


def main() -> int:
    found = urls()
    print(f"Checking {len(found)} links (timeout {TIMEOUT}s each)...", flush=True)
    broken = unverified = 0
    results = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = [pool.submit(check, url) for url in found]
        for future in as_completed(futures):
            url, status, final = future.result()
            results.append(url)
            ok = status == 200
            unreachable = isinstance(status, str)  # no HTTP answer at all: network problem, not a dead link
            broken += not ok and not unreachable
            unverified += unreachable
            label = "ok  " if ok else "????" if unreachable else "FAIL"
            moved = f"  -> {final}" if ok and final.rstrip("/") != url.rstrip("/") else ""
            print(f"{label} {status!s:>4}  {url}{moved}   [{', '.join(found[url])}]", flush=True)
    print(f"\n{len(results) - broken - unverified}/{len(results)} OK, {broken} broken, {unverified} unverifiable (host unreachable from here)")
    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(main())
