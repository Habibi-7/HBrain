"""`brain show <id>` — read an event back by ULID (or unambiguous prefix)."""

from __future__ import annotations

from pathlib import Path

from ..envelope import CommandOutput, NextAction
from ..errors import BrainError
from ..events import find_event_path_by_id, read_event
from ..schema import EventType


def run_show(vault: Path, event_id: str) -> CommandOutput:
    path = find_event_path_by_id(vault, event_id)
    if path is None:
        raise BrainError(
            code="EVENT_NOT_FOUND",
            message=f"No event matches id '{event_id}'.",
            fix="Check the ULID, or run `brain timeline` to list recent events.",
        )

    ev = read_event(path)
    rel = str(path.relative_to(vault))
    result = {
        "id": ev.id,
        "type": ev.type.value,
        "created_at": ev.created_at.isoformat().replace("+00:00", "Z"),
        "ingested_at": ev.ingested_at.isoformat().replace("+00:00", "Z"),
        "source": ev.source,
        "agent": ev.agent,
        "tags": list(ev.tags),
        "links": list(ev.links),
        "status": ev.status.value if ev.status else None,
        "hash": ev.hash,
        "path": rel,
        "body": ev.body,
    }

    next_actions = [
        NextAction(
            command="brain timeline [--last <dur>]",
            description="See events around this one",
            params={"dur": {"default": "7d"}},
        ),
        NextAction(
            command='brain add "<text>" [--type <type>] [--link <id>]',
            description="Capture a new event linked to this one",
            params={
                "type": {"enum": [t.value for t in EventType], "default": "note"},
                "link": {"value": ev.id, "description": "Target event id"},
            },
        ),
    ]

    human_summary = (
        f"{ev.id} · {ev.type.value}"
        + (f" ({ev.status.value})" if ev.status else "")
        + f" · {ev.created_at.isoformat()}\n{ev.body}"
    )

    return CommandOutput(
        result=result,
        next_actions=next_actions,
        human_summary=human_summary,
    )
