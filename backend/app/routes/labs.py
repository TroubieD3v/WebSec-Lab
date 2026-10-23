from __future__ import annotations

import asyncio
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query, Request

from ..catalog import AVAILABLE_IDS, CATALOG, LabDefinition, normalize_lang, tr
from ..services.code import build_code_payload
from ..services.verification import run_verification

router = APIRouter(tags=["labs"])


def get_lab(lab_id: str, *, require_available: bool = True) -> LabDefinition:
    lab = CATALOG.get(lab_id)
    if lab is None or (require_available and not lab.available):
        raise HTTPException(404, "Unknown lab")
    return lab


async def sync_exploit(request: Request, lab_ids: tuple[str, ...], timeout: float = 1.5) -> bool:
    """Ask the lab service which challenges were solved and persist new ones.

    Returns False when the lab service could not be reached.
    """
    store = request.app.state.store
    lock = request.app.state.progress_lock

    async with request.app.state.labs.http(timeout) as http:
        async def one(lab_id: str) -> bool:
            # Held across "read lab flag" and "persist it" so a concurrent reset cannot
            # be followed by a stale write of an exploit that was cleared meanwhile.
            async with lock:
                try:
                    response = await http.get(f"/{lab_id}/status")
                    response.raise_for_status()
                except httpx.HTTPError:
                    return False
                status = response.json()
                if status.get("solved"):
                    store.mark_exploited(lab_id)
                if status.get("blocked"):
                    store.mark_defended(lab_id)
                return True

        return all(await asyncio.gather(*(one(i) for i in lab_ids)))


def summary(lab: LabDefinition, lang: str, progress: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": lab.id,
        "title": tr(lab.title, lang),
        "summary": tr(lab.summary, lang),
        "difficulty": lab.difficulty,
        "available": lab.available,
        "owasp": lab.owasp,
        "owasp_name": lab.owasp_name,
        "progress": progress,
    }


@router.get("/labs")
async def list_labs(request: Request, lang: str = Query("en")):
    lang = normalize_lang(lang)
    labs_online = await sync_exploit(request, AVAILABLE_IDS)
    progress = request.app.state.store.all_progress()
    empty = request.app.state.store.progress("")
    return {
        "labs_online": labs_online,
        "labs": [summary(lab, lang, progress.get(lab.id, empty)) for lab in CATALOG.values()],
    }


@router.get("/labs/{lab_id}")
async def lab_detail(lab_id: str, request: Request, lang: str = Query("en")):
    lab = get_lab(lab_id)
    lang = normalize_lang(lang)
    await sync_exploit(request, (lab_id,))
    store = request.app.state.store
    revealed = store.revealed_hints(lab_id)
    return {
        **summary(lab, lang, store.progress(lab_id)),
        "cwe": list(lab.cwe),
        "task": tr(lab.task, lang),
        "root_cause": tr(lab.root_cause, lang),
        "fix": tr(lab.fix, lang),
        "hint_count": len(lab.hints),
        "revealed_hints": {level: tr(lab.hints[level - 1], lang) for level in revealed},
        "presets": [
            {"label": tr(p.label, lang), "method": p.method, "path": p.path, "headers": p.headers, "body": p.body}
            for p in lab.presets
        ],
        "references": [{"label": r.label, "url": r.url} for r in lab.references],
    }


@router.get("/labs/{lab_id}/status")
async def lab_status(lab_id: str, request: Request):
    get_lab(lab_id)
    await sync_exploit(request, (lab_id,))
    return request.app.state.store.progress(lab_id)


@router.post("/labs/{lab_id}/hints/{level}")
def reveal_hint(lab_id: str, level: int, request: Request, lang: str = Query("en")):
    lab = get_lab(lab_id)
    if not 1 <= level <= len(lab.hints):
        raise HTTPException(404, "Unknown hint")
    store = request.app.state.store
    store.reveal_hint(lab_id, level)
    return {"level": level, "text": tr(lab.hints[level - 1], normalize_lang(lang)), "hints_used": store.progress(lab_id)["hints_used"]}


@router.get("/labs/{lab_id}/code")
async def lab_code(lab_id: str, request: Request):
    get_lab(lab_id)
    async with request.app.state.labs.http() as http:
        try:
            response = await http.get(f"/{lab_id}/source")
            response.raise_for_status()
        except httpx.HTTPError:
            raise HTTPException(502, "Lab service is unavailable") from None
    return build_code_payload(response.json())


@router.post("/labs/{lab_id}/verify")
async def verify(lab_id: str, request: Request, lang: str = Query("en")):
    get_lab(lab_id)
    lang = normalize_lang(lang)
    store = request.app.state.store
    try:
        await sync_exploit(request, (lab_id,))  # capture the learner's own exploit first
        async with request.app.state.labs.http() as http:
            verdict = await run_verification(lab_id, http)
    except httpx.HTTPError:
        raise HTTPException(502, "Lab service is unavailable") from None

    passed = sum(r.passed for r in verdict.results)
    completed_now = store.record_verification(
        lab_id, len(verdict.results), passed, verdict.vulnerability_confirmed, verdict.fix_confirmed
    )
    progress = store.progress(lab_id)
    return {
        "vulnerability_confirmed": verdict.vulnerability_confirmed,
        "fix_confirmed": verdict.fix_confirmed,
        "exploited_by_you": progress["exploited"],
        "defended_by_you": progress["defended"],
        "completed": progress["completed"],
        "completed_now": completed_now,
        "passed": passed,
        "total": len(verdict.results),
        "checks": [
            {"id": r.id, "title": tr(r.title, lang), "mode": r.mode, "kind": r.kind, "passed": r.passed, "evidence": r.evidence}
            for r in verdict.results
        ],
        "progress": progress,
    }
