"""Static lab metadata and localized teaching content."""

from __future__ import annotations

from dataclasses import dataclass, field

LANGS = ("en", "ru")
DEFAULT_LANG = "en"
MODES = ("vulnerable", "fixed")

I18n = dict[str, str]


def tr(text: I18n, lang: str) -> str:
    return text.get(lang) or text[DEFAULT_LANG]


def normalize_lang(lang: str | None) -> str:
    return lang if lang in LANGS else DEFAULT_LANG


@dataclass(frozen=True)
class Preset:
    """A ready-made request for the Attack Playground."""

    label: I18n
    method: str
    path: str  # relative to /api/labs/<lab>/<mode>/
    headers: dict[str, str] = field(default_factory=dict)
    body: str | None = None


@dataclass(frozen=True)
class Reference:
    label: str
    url: str


@dataclass(frozen=True)
class LabDefinition:
    id: str
    title: I18n
    difficulty: str  # easy | medium | hard
    summary: I18n = field(default_factory=dict)
    available: bool = True
    owasp: str = ""  # e.g. "A05:2025"
    owasp_name: str = ""
    cwe: tuple[str, ...] = ()
    task: I18n = field(default_factory=dict)
    root_cause: I18n = field(default_factory=dict)
    fix: I18n = field(default_factory=dict)
    hints: tuple[I18n, ...] = ()
    presets: tuple[Preset, ...] = ()
    references: tuple[Reference, ...] = ()


def build_catalog() -> dict[str, LabDefinition]:
    # Imported lazily to keep this module free of content-module cycles.
    from .content import (
        access_control,
        broken_auth,
        csrf,
        file_upload,
        idor,
        jwt,
        path_traversal,
        race_condition,
        security_misconfiguration,
        sql_injection,
        stored_xss,
        xss,
    )

    labs = [
        sql_injection.LAB,
        xss.LAB,
        stored_xss.LAB,
        idor.LAB,
        access_control.LAB,
        csrf.LAB,
        broken_auth.LAB,
        jwt.LAB,
        path_traversal.LAB,
        file_upload.LAB,
        security_misconfiguration.LAB,
        race_condition.LAB,
    ]
    return {lab.id: lab for lab in labs}


CATALOG = build_catalog()
AVAILABLE_IDS = tuple(lab.id for lab in CATALOG.values() if lab.available)
