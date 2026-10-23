"""SQLite persistence for learner progress (the control plane's own data)."""

from __future__ import annotations

import json
import sqlite3
from collections.abc import Iterator
from contextlib import closing, contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

SCHEMA = """
CREATE TABLE IF NOT EXISTS lab_progress (
    lab_id TEXT PRIMARY KEY,
    exploited_at TEXT,
    defended_at TEXT,
    fix_verified_at TEXT,
    completed_at TEXT,
    verification_runs INTEGER NOT NULL DEFAULT 0,
    checks_run INTEGER NOT NULL DEFAULT 0,
    checks_passed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS hint_reveals (
    lab_id TEXT NOT NULL,
    level INTEGER NOT NULL,
    revealed_at TEXT NOT NULL,
    PRIMARY KEY (lab_id, level)
);
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lab_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);
"""


def _now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


class Store:
    def __init__(self, path: str) -> None:
        self.path = path
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        with self._tx() as db:
            db.executescript(SCHEMA)
            self._migrate(db)

    @staticmethod
    def _migrate(db: sqlite3.Connection) -> None:
        columns = {r["name"] for r in db.execute("PRAGMA table_info(lab_progress)")}
        if "defended_at" not in columns:
            # v1.0.x completed a lab without the learner ever trying the fixed mode. That step is
            # now required, so completions recorded under the old rule are withdrawn.
            db.execute("ALTER TABLE lab_progress ADD COLUMN defended_at TEXT")
            db.execute("UPDATE lab_progress SET completed_at = NULL")

    @contextmanager
    def _tx(self) -> Iterator[sqlite3.Connection]:
        with closing(sqlite3.connect(self.path)) as db:
            db.row_factory = sqlite3.Row
            with db:
                yield db

    @staticmethod
    def _event(db: sqlite3.Connection, lab_id: str, kind: str, detail: dict[str, Any] | None = None) -> None:
        db.execute(
            "INSERT INTO events (lab_id, kind, detail, created_at) VALUES (?, ?, ?, ?)",
            (lab_id, kind, json.dumps(detail or {}), _now()),
        )

    @staticmethod
    def _ensure(db: sqlite3.Connection, lab_id: str) -> None:
        db.execute("INSERT OR IGNORE INTO lab_progress (lab_id) VALUES (?)", (lab_id,))

    @staticmethod
    def _maybe_complete(db: sqlite3.Connection, lab_id: str) -> bool:
        row = db.execute("SELECT * FROM lab_progress WHERE lab_id = ?", (lab_id,)).fetchone()
        if row["completed_at"] or not (row["exploited_at"] and row["defended_at"] and row["fix_verified_at"]):
            return False
        db.execute("UPDATE lab_progress SET completed_at = ? WHERE lab_id = ?", (_now(), lab_id))
        Store._event(db, lab_id, "completed")
        return True

    # --- reads -----------------------------------------------------------------
    def progress(self, lab_id: str) -> dict[str, Any]:
        return self.all_progress().get(lab_id) or self._shape({"lab_id": lab_id}, 0)

    def all_progress(self) -> dict[str, dict[str, Any]]:
        with self._tx() as db:
            rows = db.execute("SELECT * FROM lab_progress").fetchall()
            hints = {
                r["lab_id"]: r["n"]
                for r in db.execute("SELECT lab_id, COUNT(*) AS n FROM hint_reveals GROUP BY lab_id")
            }
        return {r["lab_id"]: self._shape(dict(r), hints.get(r["lab_id"], 0)) for r in rows}

    @staticmethod
    def _shape(row: dict[str, Any], hints_used: int) -> dict[str, Any]:
        completed = bool(row.get("completed_at"))
        exploited = bool(row.get("exploited_at"))
        return {
            "status": "completed" if completed else "vulnerability_found" if exploited else "not_started",
            "exploited": exploited,
            "defended": bool(row.get("defended_at")),
            "fix_verified": bool(row.get("fix_verified_at")),
            "completed": completed,
            "hints_used": hints_used,
            "verification_runs": row.get("verification_runs", 0),
            "checks_run": row.get("checks_run", 0),
            "checks_passed": row.get("checks_passed", 0),
        }

    def revealed_hints(self, lab_id: str) -> list[int]:
        with self._tx() as db:
            rows = db.execute("SELECT level FROM hint_reveals WHERE lab_id = ? ORDER BY level", (lab_id,))
            return [r["level"] for r in rows]

    def history(self, limit: int = 30) -> list[dict[str, Any]]:
        with self._tx() as db:
            rows = db.execute("SELECT * FROM events ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        return [
            {"id": r["id"], "lab_id": r["lab_id"], "kind": r["kind"], "detail": json.loads(r["detail"]), "at": r["created_at"]}
            for r in rows
        ]

    # --- writes ----------------------------------------------------------------
    def reveal_hint(self, lab_id: str, level: int) -> None:
        with self._tx() as db:
            self._ensure(db, lab_id)
            cursor = db.execute(
                "INSERT OR IGNORE INTO hint_reveals (lab_id, level, revealed_at) VALUES (?, ?, ?)",
                (lab_id, level, _now()),
            )
            if cursor.rowcount:
                self._event(db, lab_id, "hint_revealed", {"level": level})

    def mark_defended(self, lab_id: str) -> bool:
        """Record that the learner repeated the attack and the fixed mode stopped it. True if new."""
        with self._tx() as db:
            self._ensure(db, lab_id)
            cursor = db.execute(
                "UPDATE lab_progress SET defended_at = ? WHERE lab_id = ? AND defended_at IS NULL",
                (_now(), lab_id),
            )
            if not cursor.rowcount:
                return False
            self._event(db, lab_id, "defense_observed")
            self._maybe_complete(db, lab_id)
            return True

    def mark_exploited(self, lab_id: str) -> bool:
        """Record that the learner exploited the vulnerable mode. True if newly recorded."""
        with self._tx() as db:
            self._ensure(db, lab_id)
            cursor = db.execute(
                "UPDATE lab_progress SET exploited_at = ? WHERE lab_id = ? AND exploited_at IS NULL",
                (_now(), lab_id),
            )
            if not cursor.rowcount:
                return False
            self._event(db, lab_id, "exploit_detected")
            self._maybe_complete(db, lab_id)
            return True

    def record_verification(
        self, lab_id: str, total: int, passed: int, vulnerability_confirmed: bool, fix_confirmed: bool
    ) -> bool:
        """Persist a verification run. True if this run completed the lab."""
        with self._tx() as db:
            self._ensure(db, lab_id)
            db.execute(
                "UPDATE lab_progress SET verification_runs = verification_runs + 1, "
                "checks_run = checks_run + ?, checks_passed = checks_passed + ? WHERE lab_id = ?",
                (total, passed, lab_id),
            )
            self._event(
                db,
                lab_id,
                "verification",
                {"passed": passed, "total": total, "vulnerability": vulnerability_confirmed, "fix": fix_confirmed},
            )
            if vulnerability_confirmed and fix_confirmed:
                cursor = db.execute(
                    "UPDATE lab_progress SET fix_verified_at = ? WHERE lab_id = ? AND fix_verified_at IS NULL",
                    (_now(), lab_id),
                )
                if cursor.rowcount:
                    self._event(db, lab_id, "fix_verified")
                return self._maybe_complete(db, lab_id)
            return False

    def reset(self) -> None:
        with self._tx() as db:
            db.executescript("DELETE FROM lab_progress; DELETE FROM hint_reveals; DELETE FROM events;")
