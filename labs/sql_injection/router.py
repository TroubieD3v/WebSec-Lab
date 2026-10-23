"""SQL Injection lab: product lookup (OWASP A05:2025 Injection).

The database is an in-memory SQLite instance with fake data. Even though the
vulnerable query is injectable, the connection is locked down with an
authorizer (read-only, no ATTACH/PRAGMA/DDL) and a per-query time limit so
that the lab cannot be used to damage the host.
"""

from __future__ import annotations

import sqlite3
import threading
import time
from contextlib import contextmanager
from pathlib import Path

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from common import Mode, mark_blocked, mark_solved

LAB_ID = "sql-injection"
SOURCE_FILE = Path(__file__)

router = APIRouter(prefix=f"/{LAB_ID}", tags=[LAB_ID])

PRODUCTS = [
    (1, "Laptop Pro", "Computers", 1299.00, 1),
    (2, "Wireless Mouse", "Accessories", 24.99, 1),
    (3, "Mechanical Keyboard", "Accessories", 89.00, 1),
    (4, "USB-C Hub", "Accessories", 39.50, 1),
    (5, "4K Monitor", "Displays", 449.00, 1),
    (6, "Prototype X-9000", "Unreleased", 9999.00, 0),
    (7, "Staff Discount Card", "Internal", 0.00, 0),
]
USERS = [
    (1, "admin", "Adm1n-S3cret!", "admin"),
    (2, "alice", "alice-secret-pw", "customer"),
    (3, "bob", "bob-secret-pw", "customer"),
]
# Values that must never be visible through the public product search.
PROTECTED_VALUES = {"Prototype X-9000", "Staff Discount Card"} | {u[2] for u in USERS}

QUERY_TIME_LIMIT = 0.5  # seconds
MAX_ROWS = 100

_lock = threading.RLock()
_conn: sqlite3.Connection | None = None
_deadline = 0.0


def _authorizer(action: int, arg1: str | None, arg2: str | None, *_: object) -> int:
    allowed = {
        sqlite3.SQLITE_SELECT,
        sqlite3.SQLITE_READ,
        sqlite3.SQLITE_RECURSIVE,
    }
    if action in allowed:
        return sqlite3.SQLITE_OK
    if action == sqlite3.SQLITE_FUNCTION and arg2 not in {"load_extension", "readfile", "writefile"}:
        return sqlite3.SQLITE_OK
    return sqlite3.SQLITE_DENY


def _progress() -> int:
    return 1 if time.monotonic() > _deadline else 0


def _build() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.executescript(
        """
        CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, category TEXT, price REAL, released INTEGER);
        CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, secret TEXT, role TEXT);
        """
    )
    conn.executemany("INSERT INTO products VALUES (?, ?, ?, ?, ?)", PRODUCTS)
    conn.executemany("INSERT INTO users VALUES (?, ?, ?, ?)", USERS)
    conn.commit()
    conn.set_authorizer(_authorizer)
    conn.set_progress_handler(_progress, 1000)
    return conn


def reset() -> None:
    global _conn
    with _lock:
        if _conn is not None:
            _conn.close()
        _conn = _build()


reset()


@contextmanager
def _session():
    """Yield (connection, captured_sql) with the query time limit armed."""
    global _deadline
    with _lock:
        assert _conn is not None
        captured: list[str] = []
        _conn.set_trace_callback(captured.append)
        _deadline = time.monotonic() + QUERY_TIME_LIMIT
        try:
            yield _conn, captured
        finally:
            _conn.set_trace_callback(None)


# region vulnerable
def vulnerable_search(conn, name):
    query = f"SELECT id, name, category, price FROM products WHERE name = '{name}' AND released = 1"
    return conn.execute(query).fetchmany(MAX_ROWS)
# endregion


# region fixed
def fixed_search(conn, name):
    query = "SELECT id, name, category, price FROM products WHERE name = ? AND released = 1"
    return conn.execute(query, (name,)).fetchmany(MAX_ROWS)
# endregion


@router.get("/{mode}/products")
def search_products(mode: Mode, request: Request, name: str = Query("", max_length=500)):
    search = vulnerable_search if mode == "vulnerable" else fixed_search
    with _session() as (conn, captured):
        try:
            rows = [dict(row) for row in search(conn, name)]
        except sqlite3.Error as exc:
            body = {"mode": mode, "error": str(exc), "query": captured[-1] if captured else None}
            # Verbose database errors are part of what makes the vulnerable mode exploitable.
            if mode == "vulnerable":
                return JSONResponse(body, status_code=500)
            return JSONResponse({"mode": mode, "error": "Invalid request"}, status_code=400)
    sql = captured[-1] if captured else None
    leaked = any(v in PROTECTED_VALUES for r in rows for v in r.values())
    if mode == "vulnerable" and leaked:
        mark_solved(LAB_ID, request)
    if mode == "fixed" and "'" in name and not leaked:
        mark_blocked(LAB_ID, request)  # an injection attempt hit the parameterized query and changed nothing
    return {"mode": mode, "query": sql, "count": len(rows), "rows": rows}
