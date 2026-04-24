"""Timeline renderer — the one killer retrieval surface for MVP.

Markdown output only in v0; HTML is deferred. The rendered artifact is
written to `<vault>/renders/timelines/<range>.md` and is a real, auditable,
human-readable file — not ephemeral stdout.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone

UTC = timezone.utc
from pathlib import Path

WEEKDAYS = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
MONTHS = (
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
)


@dataclass
class TimelineRow:
    id: str
    type: str
    created_at: datetime
    title: str
    status: str | None
    tags: list[str]
    path: str  # relative to vault root


def row_from_sqlite(row) -> TimelineRow:
    return TimelineRow(
        id=row["id"],
        type=row["type"],
        created_at=_parse_iso(row["created_at"]),
        title=row["title"],
        status=row["status"],
        tags=json.loads(row["tags"] or "[]"),
        path=row["path"],
    )


def _parse_iso(s: str) -> datetime:
    s = s.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return datetime.fromisoformat(s).astimezone(UTC)


def range_slug(since: datetime, until: datetime) -> str:
    """Compact filename slug for a timeline range.

    - Single ISO week → `2026-W17`
    - Single day      → `2026-04-24`
    - Otherwise       → `2026-04-20--2026-04-24`
    """
    s = since.astimezone(UTC)
    u = until.astimezone(UTC)
    # `until` is exclusive; derive the last included day
    from datetime import timedelta

    last = u - timedelta(microseconds=1)
    # Same day?
    if s.date() == last.date():
        return s.strftime("%Y-%m-%d")
    # Same ISO week?
    s_year, s_week, _ = s.isocalendar()
    l_year, l_week, _ = last.isocalendar()
    if (s_year, s_week) == (l_year, l_week):
        return f"{s_year:04d}-W{s_week:02d}"
    return f"{s.strftime('%Y-%m-%d')}--{last.strftime('%Y-%m-%d')}"


def render_timeline_markdown(
    rows: list[TimelineRow],
    *,
    since: datetime,
    until: datetime,
    generated_at: datetime | None = None,
) -> str:
    generated_at = generated_at or datetime.now(UTC)

    by_day: dict[str, list[TimelineRow]] = {}
    for r in rows:
        day_key = r.created_at.astimezone(UTC).strftime("%Y-%m-%d")
        by_day.setdefault(day_key, []).append(r)

    counts_by_type: dict[str, int] = {}
    for r in rows:
        counts_by_type[r.type] = counts_by_type.get(r.type, 0) + 1

    lines: list[str] = []
    range_label = _range_label(since, until)
    lines.append(f"# Timeline — {range_label}")
    lines.append("")
    gen = generated_at.strftime("%Y-%m-%dT%H:%M:%SZ")
    total = len(rows)
    type_summary = ", ".join(f"{k}: {v}" for k, v in sorted(counts_by_type.items()))
    summary = f"Generated: {gen} · {total} event{'s' if total != 1 else ''}"
    if type_summary:
        summary += f" ({type_summary})"
    lines.append(summary)
    lines.append("")

    if not rows:
        lines.append("_No events in this range._")
        lines.append("")
        return "\n".join(lines)

    for day_key in sorted(by_day.keys()):
        day_rows = by_day[day_key]
        day_dt = datetime.strptime(day_key, "%Y-%m-%d").replace(tzinfo=UTC)
        heading = (
            f"## {WEEKDAYS[day_dt.weekday()]}, "
            f"{MONTHS[day_dt.month - 1]} {day_dt.day}, {day_dt.year}"
        )
        lines.append(heading)
        lines.append("")
        for r in sorted(day_rows, key=lambda x: x.created_at):
            lines.append(_format_row(r))
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def _range_label(since: datetime, until: datetime) -> str:
    from datetime import timedelta

    s = since.astimezone(UTC)
    u = until.astimezone(UTC)
    last = u - timedelta(microseconds=1)
    if s.date() == last.date():
        return s.strftime("%Y-%m-%d")
    return f"{s.strftime('%Y-%m-%d')} → {last.strftime('%Y-%m-%d')}"


def _format_row(r: TimelineRow) -> str:
    hh_mm = r.created_at.astimezone(UTC).strftime("%H:%M")
    type_label = r.type if not r.status else f"{r.type} ({r.status})"
    tags_label = ""
    if r.tags:
        tags_label = "  " + " ".join(f"#{t}" for t in r.tags)
    title = r.title or "(empty)"
    return f"- **{hh_mm}** · {type_label} — {title} `[{r.id}]`{tags_label}"


def render_dir(vault: Path) -> Path:
    return vault / "renders" / "timelines"


def write_artifact(vault: Path, text: str, range_slug_str: str) -> Path:
    d = render_dir(vault)
    d.mkdir(parents=True, exist_ok=True)
    out = d / f"timeline-{range_slug_str}.md"
    tmp = out.with_suffix(out.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(out)
    return out
