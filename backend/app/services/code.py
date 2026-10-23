"""Vulnerable vs. fixed source comparison (Code Diff)."""

from __future__ import annotations

import difflib
from typing import Any


def _line(number: int, text: str, kind: str) -> dict[str, Any]:
    return {"n": number, "text": text, "kind": kind}


def side_by_side(old: str, new: str) -> list[dict[str, Any]]:
    """Align two texts into rows of {left, right}; either side may be None."""
    a, b = old.splitlines(), new.splitlines()
    rows: list[dict[str, Any]] = []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                rows.append({"left": _line(i1 + k + 1, a[i1 + k], "same"), "right": _line(j1 + k + 1, b[j1 + k], "same")})
            continue
        for k in range(max(i2 - i1, j2 - j1)):
            left = _line(i1 + k + 1, a[i1 + k], "del") if i1 + k < i2 else None
            right = _line(j1 + k + 1, b[j1 + k], "add") if j1 + k < j2 else None
            rows.append({"left": left, "right": right})
    return rows


def build_code_payload(source: dict[str, str]) -> dict[str, Any]:
    vulnerable, fixed = source["vulnerable"], source["fixed"]
    unified = "".join(
        difflib.unified_diff(
            vulnerable.splitlines(keepends=True),
            fixed.splitlines(keepends=True),
            fromfile="vulnerable",
            tofile="fixed",
        )
    )
    return {
        "file": source["file"],
        "language": source["language"],
        "vulnerable": vulnerable,
        "fixed": fixed,
        "rows": side_by_side(vulnerable, fixed),
        "unified": unified,
    }
