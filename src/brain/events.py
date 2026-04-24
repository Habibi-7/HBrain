"""Core event I/O — paths, slug, hash, frontmatter (de)serialization, write/read/list.

Pure-ish: no stdout, no envelope. Higher layers compose these primitives.
"""

from __future__ import annotations

import hashlib
import re
from collections.abc import Iterator
from datetime import datetime, timezone

UTC = timezone.utc
from pathlib import Path

import frontmatter
import yaml
from ulid import ULID

from .errors import BrainError
from .schema import (
    ALLOWED_SOURCES,
    SCHEMA_VERSION,
    Event,
    EventStatus,
    EventType,
)

SLUG_MAX_LEN = 48
TITLE_MAX_LEN = 120
ULID_LEN = 26


def new_ulid() -> str:
    return str(ULID())


def content_hash(body: str) -> str:
    digest = hashlib.sha256(body.encode("utf-8")).hexdigest()
    return f"sha256:{digest}"


def _first_meaningful_line(text: str) -> str:
    for line in text.splitlines():
        s = line.strip()
        if s:
            # Strip markdown heading markers, blockquote markers, bullets
            return re.sub(r"^[#>\-\*\+\s]+", "", s)
    return ""


def make_slug(text: str, max_len: int = SLUG_MAX_LEN) -> str:
    first = _first_meaningful_line(text).lower()
    slug = re.sub(r"[^a-z0-9]+", "-", first).strip("-")
    if not slug:
        return "event"
    return slug[:max_len].rstrip("-") or "event"


def event_title(body: str) -> str:
    """Short one-line summary used in timeline and cache."""
    first = _first_meaningful_line(body)
    return first[:TITLE_MAX_LEN] if first else "(empty)"


def event_path(vault: Path, ev: Event, slug: str | None = None) -> Path:
    d = ev.created_at.astimezone(UTC)
    s = slug if slug is not None else make_slug(ev.body)
    return (
        vault / "events" / f"{d.year:04d}" / f"{d.month:02d}" / f"{d.day:02d}" / f"{ev.id}-{s}.md"
    )


# ---------- frontmatter (de)serialization ----------


def _iso_utc(dt: datetime) -> str:
    return dt.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _parse_dt(value: str | datetime) -> datetime:
    if isinstance(value, datetime):
        return value.astimezone(UTC) if value.tzinfo else value.replace(tzinfo=UTC)
    s = value.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return datetime.fromisoformat(s).astimezone(UTC)


def event_to_frontmatter(ev: Event) -> dict:
    """Ordered dict of frontmatter keys (order matters for stable YAML output)."""
    data: dict = {
        "id": ev.id,
        "schema": SCHEMA_VERSION,
        "type": ev.type.value,
        "created_at": _iso_utc(ev.created_at),
        "ingested_at": _iso_utc(ev.ingested_at),
        "source": ev.source,
        "agent": ev.agent,
        "tags": list(ev.tags),
        "links": list(ev.links),
        "hash": ev.hash,
    }
    if ev.status is not None:
        # Tasks get status between agent and tags? Keep at end to avoid reordering existing files.
        data["status"] = ev.status.value
    return data


def event_from_frontmatter(fm: dict, body: str) -> Event:
    schema_v = int(fm.get("schema", SCHEMA_VERSION))
    if schema_v > SCHEMA_VERSION:
        raise BrainError(
            code="SCHEMA_TOO_NEW",
            message=f"Event written with schema v{schema_v}; this CLI knows v{SCHEMA_VERSION}.",
            fix="Upgrade the `brain` CLI, or edit the file to match the older schema.",
        )
    status = fm.get("status")
    status_enum = EventStatus(status) if status is not None else None
    return Event(
        id=fm["id"],
        type=EventType(fm["type"]),
        created_at=_parse_dt(fm["created_at"]),
        ingested_at=_parse_dt(fm["ingested_at"]),
        source=fm.get("source", "cli"),
        agent=fm.get("agent", "unknown"),
        tags=list(fm.get("tags", []) or []),
        links=list(fm.get("links", []) or []),
        status=status_enum,
        hash=fm["hash"],
        body=body,
    )


def _dump_yaml(data: dict) -> str:
    """Block-style YAML with stable key order."""
    return yaml.safe_dump(
        data,
        sort_keys=False,
        allow_unicode=True,
        default_flow_style=False,
    )


def _compose_file(ev: Event) -> str:
    fm = event_to_frontmatter(ev)
    return "---\n" + _dump_yaml(fm) + "---\n\n" + ev.body.rstrip() + "\n"


# ---------- write / read / list ----------


def write_event(vault: Path, ev: Event) -> Path:
    path = event_path(vault, ev)
    path.parent.mkdir(parents=True, exist_ok=True)
    text = _compose_file(ev)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)
    return path


def read_event(path: Path) -> Event:
    text = path.read_text(encoding="utf-8")
    post = frontmatter.loads(text)
    return event_from_frontmatter(dict(post.metadata), post.content)


def iter_event_paths(vault: Path) -> Iterator[Path]:
    root = vault / "events"
    if not root.exists():
        return iter(())
    return iter(sorted(root.rglob("*.md")))


def find_event_path_by_id(vault: Path, event_id: str) -> Path | None:
    """Locate an event file by ULID. Supports exact ID or unambiguous prefix."""
    root = vault / "events"
    if not root.exists():
        return None
    # Fast path: exact ID (ULIDs are fixed length)
    if len(event_id) == ULID_LEN:
        matches = list(root.rglob(f"{event_id}-*.md"))
    else:
        matches = list(root.rglob(f"{event_id}*-*.md"))
    if not matches:
        return None
    if len(matches) > 1:
        raise BrainError(
            code="AMBIGUOUS_ID",
            message=f"Prefix '{event_id}' matches {len(matches)} events.",
            fix="Supply a longer id prefix or the full ULID.",
        )
    return matches[0]


# ---------- validation ----------


def validate_source(source: str) -> None:
    if source not in ALLOWED_SOURCES:
        raise BrainError(
            code="INVALID_SOURCE",
            message=f"Unknown source '{source}'.",
            fix=f"Use one of: {', '.join(sorted(ALLOWED_SOURCES))}.",
        )


def validate_body(body: str) -> None:
    if not body.strip():
        raise BrainError(
            code="EMPTY_BODY",
            message="Refusing to capture an empty event.",
            fix="Pipe text via stdin, pass a body argument, or use --file <path>.",
        )


def validate_type(value: str) -> EventType:
    try:
        return EventType(value)
    except ValueError:
        allowed = ", ".join(t.value for t in EventType)
        raise BrainError(
            code="INVALID_TYPE",
            message=f"Unknown type '{value}'.",
            fix=f"Use one of: {allowed}. Omit --type to default to 'note'.",
        ) from None
