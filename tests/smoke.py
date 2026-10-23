"""Smoke test for a running stack: every lab must verify against both modes.

    python tests/smoke.py [base_url]        (default http://127.0.0.1:3000, or :8000 without nginx)

Used after `docker compose up` and by the release checklist. Standard library only.
"""

from __future__ import annotations

import json
import sys
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3000").rstrip("/")


def call(method: str, path: str) -> dict:
    request = urllib.request.Request(BASE + path, method=method, data=b"" if method == "POST" else None)
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def main() -> int:
    health = call("GET", "/api/health")
    print(f"health: {health}")
    if not health.get("labs_online"):
        print("FAIL: lab service is not reachable")
        return 1
    call("POST", "/api/progress/reset")
    labs = [lab["id"] for lab in call("GET", "/api/labs")["labs"] if lab["available"]]
    failed = 0
    for lab in labs:
        result = call("POST", f"/api/labs/{lab}/verify")
        ok = result["vulnerability_confirmed"] and result["fix_confirmed"]
        failed += not ok
        print(f"{'ok  ' if ok else 'FAIL'} {lab:28} {result['passed']}/{result['total']} checks")
        for check in result["checks"]:
            if not check["passed"]:
                print(f"       - [{check['mode']}/{check['kind']}] {check['title']}: {check['evidence']}")
    call("POST", "/api/progress/reset")
    print(f"{len(labs) - failed}/{len(labs)} labs verified")
    return 1 if failed or len(labs) != 12 else 0


if __name__ == "__main__":
    sys.exit(main())
