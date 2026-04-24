"""`brain init <path>` — scaffold a new vault."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from ..config import VAULT_MARKER
from ..envelope import CommandOutput, NextAction
from ..errors import BrainError

CONFIG_TEMPLATE = """# brain vault config
# This file is hand-editable. Keys are intentionally few.

schema_version = 1
created_at = "{created_at}"
"""


def run_init(path: Path) -> CommandOutput:
    vault = path.expanduser().resolve()
    marker = vault / VAULT_MARKER

    already = marker.is_dir()
    if not already:
        vault.mkdir(parents=True, exist_ok=True)
        marker.mkdir(parents=True, exist_ok=True)
        (vault / "events").mkdir(parents=True, exist_ok=True)
        (vault / "renders" / "timelines").mkdir(parents=True, exist_ok=True)
        (vault / "audit").mkdir(parents=True, exist_ok=True)

    config = marker / "config.toml"
    if not config.exists():
        config.write_text(
            CONFIG_TEMPLATE.format(
                created_at=datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            ),
            encoding="utf-8",
        )

    # Refuse to clobber if the target exists as a non-empty folder that is
    # clearly not a vault (no marker) — this avoids accidental reinit of some
    # unrelated directory.
    if not marker.is_dir():
        raise BrainError(
            code="INIT_FAILED",
            message=f"Could not create vault marker at {marker}",
            fix="Check permissions on the target directory.",
        )

    result = {
        "vault": str(vault),
        "already_initialized": already,
        "paths": {
            "events": str(vault / "events"),
            "renders": str(vault / "renders"),
            "audit": str(vault / "audit"),
            "config": str(config),
        },
    }
    next_actions = [
        NextAction(
            command='brain add "<text>" [--type <type>] [--tags <a,b>]',
            description="Capture your first event",
            params={
                "type": {
                    "enum": ["note", "task", "decision", "fact", "link"],
                    "default": "note",
                    "description": "Event type",
                }
            },
        ),
        NextAction(
            command=f"export BRAIN_DIR={vault}",
            description="Point future brain calls at this vault (or pass --vault each time)",
        ),
        NextAction(
            command="brain timeline",
            description="See recent events (empty until you capture some)",
        ),
    ]

    summary = f"Initialized vault at {vault}" if not already else f"Vault already exists at {vault}"
    return CommandOutput(result=result, next_actions=next_actions, human_summary=summary)
