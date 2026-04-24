"""Append-only JSONL audit log of writes to the vault.

One file per UTC day at `<vault>/audit/YYYY-MM-DD.jsonl`. Each line is a
self-contained JSON object: timestamp, command, event id, path (relative),
actor/agent, and outcome. This is the auditable-artifacts guarantee — every
change is traceable to who/what/when/why without reading the files themselves.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone

UTC = timezone.utc
from pathlib import Path
from typing import Any


def _today_path(vault: Path) -> Path:
    today = datetime.now(UTC).strftime("%Y-%m-%d")
    return vault / "audit" / f"{today}.jsonl"


def append(
    vault: Path,
    *,
    command: str,
    event_id: str | None,
    event_path: str | None,
    outcome: str,
    agent: str = "unknown",
    extra: dict[str, Any] | None = None,
) -> None:
    line = {
        "ts": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "command": command,
        "outcome": outcome,
        "agent": agent,
        "pid": os.getpid(),
    }
    if event_id is not None:
        line["event_id"] = event_id
    if event_path is not None:
        line["event_path"] = event_path
    if extra:
        line.update(extra)

    path = _today_path(vault)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(line, ensure_ascii=False) + "\n")
