from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Settings:
    labs_url: str = field(default_factory=lambda: os.getenv("LABS_URL", "http://127.0.0.1:8081"))
    progress_db: str = field(default_factory=lambda: os.getenv("PROGRESS_DB", "data/progress.db"))
    labs_timeout: float = 5.0
    max_request_body: int = 64 * 1024
    max_response_body: int = 256 * 1024
