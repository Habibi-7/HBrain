"""`brain timeline` — query + (optionally) render the killer retrieval surface."""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

UTC = timezone.utc
from pathlib import Path

from .. import cache
from ..envelope import CommandOutput, NextAction
from ..errors import BrainError
from ..events import iter_event_paths
from ..render import (
    range_slug,
    render_timeline_markdown,
    row_from_sqlite,
    write_artifact,
)
from ..schema import EventType

_DUR_RE = re.compile(r"^\s*(\d+)\s*([smhdwM])\s*$")


def parse_duration(value: str) -> timedelta:
    """Parse a duration like `24h`, `7d`, `2w`, `1m` (m = month = 30d in MVP)."""
    m = _DUR_RE.match(value)
    if not m:
        raise BrainError(
            code="INVALID_DURATION",
            message=f"Cannot parse duration '{value}'.",
            fix="Use forms like 24h, 7d, 2w, 1m (m = 30 days in MVP).",
        )
    n = int(m.group(1))
    unit = m.group(2)
    if unit == "s":
        return timedelta(seconds=n)
    if unit == "m":
        return timedelta(minutes=n)
    if unit == "h":
        return timedelta(hours=n)
    if unit == "d":
        return timedelta(days=n)
    if unit == "w":
        return timedelta(weeks=n)
    if unit == "M":
        return timedelta(days=30 * n)
    # Unreachable given the regex, but keeps the type checker happy.
    raise BrainError(
        code="INVALID_DURATION",
        message=f"Unknown duration unit '{unit}'.",
        fix="Use s, m, h, d, w, or M (capital M for months).",
    )


def _parse_boundary(s: str, *, end: bool) -> datetime:
    """Parse an ISO date/datetime into a UTC boundary. Bare dates snap to midnight."""
    raw = s.strip()
    try:
        if "T" in raw:
            iso = raw.replace("Z", "+00:00")
            dt = datetime.fromisoformat(iso)
            return dt.astimezone(UTC) if dt.tzinfo else dt.replace(tzinfo=UTC)
        # bare date
        dt = datetime.strptime(raw, "%Y-%m-%d").replace(tzinfo=UTC)
        return dt + timedelta(days=1) if end else dt
    except ValueError as e:
        raise BrainError(
            code="INVALID_DATE",
            message=f"Cannot parse date '{s}': {e}",
            fix="Use YYYY-MM-DD or a full ISO-8601 timestamp.",
        ) from None


def _ensure_cache_fresh(vault: Path) -> None:
    """If cache is empty but events exist, rebuild. Cheap safety net."""
    if not (vault / ".brain" / "cache.sqlite").exists():
        cache.rebuild(vault)
        return
    with cache.connect(vault) as conn:
        cur = conn.execute("SELECT COUNT(*) FROM events")
        row_count = cur.fetchone()[0]
    # If cache is empty but there are event files, rebuild.
    if row_count == 0 and any(True for _ in iter_event_paths(vault)):
        cache.rebuild(vault)


def run_timeline(
    vault: Path,
    *,
    since: str | None = None,
    until: str | None = None,
    last: str | None = None,
    types: list[str] | None = None,
    tag: str | None = None,
    limit: int | None = None,
    write: bool = False,
    max_events_in_envelope: int = 50,
) -> CommandOutput:
    # Resolve types
    resolved_types: list[str] | None = None
    if types:
        resolved_types = []
        for t in types:
            try:
                resolved_types.append(EventType(t).value)
            except ValueError:
                allowed = ", ".join(t.value for t in EventType)
                raise BrainError(
                    code="INVALID_TYPE",
                    message=f"Unknown type '{t}'.",
                    fix=f"Use one of: {allowed}.",
                ) from None

    # Resolve range
    now = datetime.now(UTC)
    if since is None and until is None and last is None:
        since_dt = now - timedelta(days=7)
        until_dt = now
    elif last is not None:
        if since is not None or until is not None:
            raise BrainError(
                code="CONFLICTING_FLAGS",
                message="Use --last OR --since/--until, not both.",
                fix="Remove --last, or remove --since/--until.",
            )
        since_dt = now - parse_duration(last)
        until_dt = now
    else:
        since_dt = _parse_boundary(since, end=False) if since else now - timedelta(days=7)
        until_dt = _parse_boundary(until, end=True) if until else now

    if until_dt <= since_dt:
        raise BrainError(
            code="INVALID_RANGE",
            message=f"--until {until_dt.isoformat()} must be after --since {since_dt.isoformat()}.",
            fix="Widen the range or swap the bounds.",
        )

    _ensure_cache_fresh(vault)

    with cache.connect(vault) as conn:
        rows = cache.query_range(
            conn,
            since_iso=since_dt.astimezone(UTC).isoformat(),
            until_iso=until_dt.astimezone(UTC).isoformat(),
            types=resolved_types,
            tag=tag,
            limit=limit,
        )

    tl_rows = [row_from_sqlite(r) for r in rows]
    counts_by_type: dict[str, int] = {}
    for r in tl_rows:
        counts_by_type[r.type] = counts_by_type.get(r.type, 0) + 1

    # Optionally write the markdown artifact.
    rendered_path: str | None = None
    if write:
        md = render_timeline_markdown(tl_rows, since=since_dt, until=until_dt)
        slug = range_slug(since_dt, until_dt)
        out_path = write_artifact(vault, md, slug)
        rendered_path = str(out_path.relative_to(vault))

    # Prepare envelope payload — truncate to protect agent context.
    total = len(tl_rows)
    truncated = total > max_events_in_envelope
    shown = tl_rows[:max_events_in_envelope] if truncated else tl_rows
    events_payload = [
        {
            "id": r.id,
            "type": r.type,
            "created_at": r.created_at.isoformat().replace("+00:00", "Z"),
            "title": r.title,
            "status": r.status,
            "tags": list(r.tags),
            "path": r.path,
        }
        for r in shown
    ]

    result = {
        "range": {
            "since": since_dt.astimezone(UTC).isoformat().replace("+00:00", "Z"),
            "until": until_dt.astimezone(UTC).isoformat().replace("+00:00", "Z"),
        },
        "counts": {"total": total, "by_type": counts_by_type},
        "showing": len(shown),
        "truncated": truncated,
        "events": events_payload,
    }
    if rendered_path:
        result["rendered_path"] = rendered_path

    next_actions: list[NextAction] = [
        NextAction(
            command="brain show <id>",
            description="Read one event in full",
            params={
                "id": {
                    "enum": [r.id for r in shown],
                    "description": "Pick one of the listed event ids",
                }
            }
            if shown
            else None,
        ),
        NextAction(
            command="brain timeline --last <dur>",
            description="Change the range",
            params={"dur": {"default": "7d"}},
        ),
        NextAction(
            command="brain timeline --type <type> [--last <dur>]",
            description="Filter by event type",
            params={
                "type": {"enum": [t.value for t in EventType]},
                "dur": {"default": "7d"},
            },
        ),
    ]
    if not write:
        next_actions.append(
            NextAction(
                command="brain timeline --format md --write [--last <dur>]",
                description="Write this view as a markdown artifact under renders/",
            )
        )

    human_summary = _format_human(tl_rows, since_dt, until_dt, rendered_path)
    return CommandOutput(
        result=result,
        next_actions=next_actions,
        human_summary=human_summary,
        artifact_path=rendered_path,
    )


def _format_human(rows, since, until, rendered_path):
    """Human pretty-printer: reuse the markdown renderer's output for consistency."""
    body = render_timeline_markdown(rows, since=since, until=until)
    if rendered_path:
        body += f"\n_Written to `{rendered_path}`._\n"
    return body
