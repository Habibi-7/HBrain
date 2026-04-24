"""`brain add` — the capture path.

Accepts a body via positional arg, stdin, or --file, writes an Event to the
vault, updates the cache, appends to the audit log, and returns next_actions
for the agent to chain into.

Voice / image / email ingestion are intentionally not wired yet; their flags
return a structured NOT_IMPLEMENTED error with a fix hint.
"""

from __future__ import annotations

import sys
from datetime import UTC, datetime
from pathlib import Path

from .. import audit, cache
from ..envelope import CommandOutput, NextAction
from ..errors import BrainError
from ..events import (
    content_hash,
    event_title,
    new_ulid,
    validate_body,
    validate_source,
    validate_type,
    write_event,
)
from ..schema import Event, EventStatus, EventType


def _read_body(
    positional: str | None,
    file: Path | None,
    stdin_fallback: bool,
) -> str:
    """Resolve the body from exactly one of: positional, file, stdin."""
    sources_given = sum(x is not None and x != "" for x in (positional, file))
    if sources_given > 1:
        raise BrainError(
            code="TOO_MANY_SOURCES",
            message="Pass the body as exactly one of: positional arg, --file, or stdin.",
            fix="Pick one input channel per call.",
        )

    if positional:
        return positional
    if file is not None:
        try:
            return file.read_text(encoding="utf-8")
        except FileNotFoundError:
            raise BrainError(
                code="FILE_NOT_FOUND",
                message=f"File not found: {file}",
                fix="Check the path, or pass the body as a positional argument.",
            ) from None
        except OSError as e:
            raise BrainError(
                code="FILE_UNREADABLE",
                message=f"Could not read {file}: {e}",
                fix="Check permissions on the file.",
            ) from None

    if stdin_fallback and not sys.stdin.isatty():
        return sys.stdin.read()

    raise BrainError(
        code="EMPTY_BODY",
        message="No body provided.",
        fix='Pass text: brain add "..." OR pipe into stdin OR --file <path>.',
    )


def _not_implemented(channel: str) -> BrainError:
    return BrainError(
        code="NOT_IMPLEMENTED",
        message=f"Ingestion channel '{channel}' is not wired in this MVP.",
        fix="Transcribe/OCR/parse yourself and pass the result as --file or text.",
    )


def run_add(
    vault: Path,
    *,
    body: str | None = None,
    file: Path | None = None,
    voice: Path | None = None,
    image: Path | None = None,
    email: Path | None = None,
    type_: str = "note",
    tags: list[str] | None = None,
    links: list[str] | None = None,
    status: str | None = None,
    source: str = "cli",
    agent: str = "unknown",
    created_at: datetime | None = None,
    stdin_fallback: bool = True,
) -> CommandOutput:
    if voice is not None:
        raise _not_implemented("voice")
    if image is not None:
        raise _not_implemented("image")
    if email is not None:
        raise _not_implemented("email")

    text = _read_body(body, file, stdin_fallback)
    validate_body(text)
    validate_source(source)
    ev_type: EventType = validate_type(type_)

    ev_status: EventStatus | None = None
    if status is not None:
        try:
            ev_status = EventStatus(status)
        except ValueError:
            allowed = ", ".join(s.value for s in EventStatus)
            raise BrainError(
                code="INVALID_STATUS",
                message=f"Unknown status '{status}'.",
                fix=f"Use one of: {allowed}.",
            ) from None
    if ev_status is not None and ev_type is not EventType.TASK:
        raise BrainError(
            code="STATUS_WITHOUT_TASK",
            message="--status is only valid with --type task.",
            fix="Either drop --status, or set --type task.",
        )
    if ev_type is EventType.TASK and ev_status is None:
        ev_status = EventStatus.OPEN

    now = datetime.now(UTC)
    event = Event(
        id=new_ulid(),
        type=ev_type,
        created_at=(created_at or now).astimezone(UTC),
        ingested_at=now,
        source=source,
        agent=agent,
        tags=list(tags or []),
        links=list(links or []),
        status=ev_status,
        hash=content_hash(text),
        body=text,
    )

    path = write_event(vault, event)

    # Update the cache (lazy-on-write).
    with cache.connect(vault) as conn:
        cache.upsert(conn, event, path, vault, path.stat().st_mtime_ns)

    # Audit log.
    audit.append(
        vault,
        command="brain add",
        event_id=event.id,
        event_path=str(path.relative_to(vault)),
        outcome="ok",
        agent=agent,
        extra={"type": event.type.value, "source": event.source},
    )

    rel = str(path.relative_to(vault))
    title = event_title(event.body)
    result = {
        "id": event.id,
        "path": rel,
        "type": event.type.value,
        "title": title,
    }
    if ev_status is not None:
        result["status"] = ev_status.value

    next_actions = [
        NextAction(
            command="brain show <id>",
            description="Read the event back",
            params={"id": {"value": event.id, "description": "Event ULID"}},
        ),
        NextAction(
            command="brain timeline [--last <dur>]",
            description="See recent activity",
            params={
                "dur": {
                    "default": "7d",
                    "description": "Duration like 24h, 7d, 1m",
                }
            },
        ),
        NextAction(
            command='brain add "<text>" [--type <type>] [--tags <a,b>]',
            description="Capture another event",
            params={
                "type": {
                    "enum": [t.value for t in EventType],
                    "default": "note",
                }
            },
        ),
    ]

    summary = f"Captured {event.type.value} · {event.id} · {rel}"
    return CommandOutput(
        result=result,
        next_actions=next_actions,
        human_summary=summary,
    )
