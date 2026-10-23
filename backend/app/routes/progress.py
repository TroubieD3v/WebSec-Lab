from __future__ import annotations

import httpx
from fastapi import APIRouter, Query, Request

from .. import __version__
from ..catalog import AVAILABLE_IDS, CATALOG, normalize_lang, tr
from .labs import sync_exploit

router = APIRouter(tags=["progress"])

ACHIEVEMENTS = (
    ("first-blood", {"en": "First Blood", "ru": "Первая кровь"},
     {"en": "Exploit your first vulnerability.", "ru": "Проэксплуатируйте первую уязвимость."}),
    ("patched", {"en": "Patch Master", "ru": "Мастер исправлений"},
     {"en": "Complete a lab: exploit it and verify the fix.", "ru": "Завершите лабораторию: эксплуатация и проверка исправления."}),
    ("no-hints", {"en": "Unassisted", "ru": "Без подсказок"},
     {"en": "Complete a lab without revealing any hint.", "ru": "Завершите лабораторию, не открывая подсказки."}),
    ("all-clear", {"en": "All Clear", "ru": "Всё чисто"},
     {"en": "Complete every available lab.", "ru": "Завершите все доступные лаборатории."}),
)


@router.get("/health")
async def health(request: Request):
    try:
        async with request.app.state.labs.http(1.5) as http:
            online = (await http.get("/health")).status_code == 200
    except httpx.HTTPError:
        online = False
    return {"status": "ok", "version": __version__, "labs_online": online}


@router.get("/progress")
async def get_progress(request: Request, lang: str = Query("en")):
    lang = normalize_lang(lang)
    await sync_exploit(request, AVAILABLE_IDS)
    store = request.app.state.store
    progress = store.all_progress()
    done = {i for i, p in progress.items() if p["completed"]}
    unlocked = {
        "first-blood": any(p["exploited"] for p in progress.values()),
        "patched": bool(done),
        "no-hints": any(progress[i]["hints_used"] == 0 for i in done),
        "all-clear": set(AVAILABLE_IDS) <= done,
    }
    return {
        "labs_available": len(AVAILABLE_IDS),
        "labs_planned": len(CATALOG),
        "completed": len(done),
        "exploited": sum(p["exploited"] for p in progress.values()),
        "hints_used": sum(p["hints_used"] for p in progress.values()),
        "checks_run": sum(p["checks_run"] for p in progress.values()),
        "checks_passed": sum(p["checks_passed"] for p in progress.values()),
        "achievements": [
            {"id": id, "title": tr(title, lang), "description": tr(desc, lang), "unlocked": unlocked[id]}
            for id, title, desc in ACHIEVEMENTS
        ],
        "history": [
            {**event, "lab_title": tr(CATALOG[event["lab_id"]].title, lang) if event["lab_id"] in CATALOG else event["lab_id"]}
            for event in store.history()
        ],
    }


@router.post("/progress/reset")
async def reset_progress(request: Request):
    async with request.app.state.progress_lock:  # see sync_exploit
        request.app.state.store.reset()
        try:
            async with request.app.state.labs.http() as http:
                await http.post("/reset-all")
        except httpx.HTTPError:
            pass  # lab state is in-memory; it is also cleared on container restart
    return {"reset": True}
