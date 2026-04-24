from __future__ import annotations

from datetime import datetime, timedelta, timezone

UTC = timezone.utc

import pytest

from brain.commands.add import run_add
from brain.commands.timeline import parse_duration, run_timeline
from brain.errors import BrainError
from brain.render import range_slug


def test_parse_duration_units():
    assert parse_duration("30s") == timedelta(seconds=30)
    assert parse_duration("5m") == timedelta(minutes=5)
    assert parse_duration("2h") == timedelta(hours=2)
    assert parse_duration("7d") == timedelta(days=7)
    assert parse_duration("2w") == timedelta(weeks=2)
    assert parse_duration("1M") == timedelta(days=30)


def test_parse_duration_invalid():
    with pytest.raises(BrainError) as exc:
        parse_duration("banana")
    assert exc.value.code == "INVALID_DURATION"


def test_range_slug_single_day():
    s = datetime(2026, 4, 24, tzinfo=UTC)
    u = s + timedelta(days=1)
    assert range_slug(s, u) == "2026-04-24"


def test_range_slug_iso_week():
    # Week 17 of 2026 starts Mon 2026-04-20
    s = datetime(2026, 4, 20, tzinfo=UTC)
    u = s + timedelta(days=7)
    assert range_slug(s, u) == "2026-W17"


def test_timeline_empty(vault):
    out = run_timeline(vault, last="7d")
    assert out.result["counts"]["total"] == 0
    assert out.result["events"] == []


def test_timeline_returns_recent_events(vault):
    now = datetime.now(UTC)
    run_add(vault, body="today one", type_="note", created_at=now, stdin_fallback=False)
    run_add(vault, body="today two", type_="decision", created_at=now, stdin_fallback=False)
    out = run_timeline(vault, last="1d")
    assert out.result["counts"]["total"] == 2
    assert set(out.result["counts"]["by_type"].keys()) == {"note", "decision"}


def test_timeline_filters_by_type(vault):
    now = datetime.now(UTC)
    run_add(vault, body="n", type_="note", created_at=now, stdin_fallback=False)
    run_add(vault, body="t", type_="task", created_at=now, stdin_fallback=False)
    out = run_timeline(vault, last="1d", types=["task"])
    assert out.result["counts"]["total"] == 1
    assert out.result["events"][0]["type"] == "task"


def test_timeline_filters_by_tag(vault):
    now = datetime.now(UTC)
    run_add(
        vault,
        body="tagged",
        type_="note",
        tags=["research"],
        created_at=now,
        stdin_fallback=False,
    )
    run_add(vault, body="plain", type_="note", created_at=now, stdin_fallback=False)
    out = run_timeline(vault, last="1d", tag="research")
    assert out.result["counts"]["total"] == 1


def test_timeline_since_until(vault):
    old = datetime.now(UTC) - timedelta(days=30)
    recent = datetime.now(UTC) - timedelta(days=2)
    run_add(vault, body="old", type_="note", created_at=old, stdin_fallback=False)
    run_add(vault, body="recent", type_="note", created_at=recent, stdin_fallback=False)
    # last 7 days: only `recent` should appear
    out = run_timeline(vault, last="7d")
    assert out.result["counts"]["total"] == 1


def test_timeline_writes_markdown_artifact(vault):
    now = datetime.now(UTC)
    run_add(vault, body="capture one", type_="note", created_at=now, stdin_fallback=False)
    out = run_timeline(vault, last="1d", write=True)
    assert "rendered_path" in out.result
    rendered = vault / out.result["rendered_path"]
    assert rendered.exists()
    text = rendered.read_text(encoding="utf-8")
    assert text.startswith("# Timeline")
    assert "capture one" in text


def test_timeline_conflicting_flags(vault):
    with pytest.raises(BrainError) as exc:
        run_timeline(vault, last="1d", since="2026-01-01")
    assert exc.value.code == "CONFLICTING_FLAGS"


def test_timeline_invalid_type(vault):
    with pytest.raises(BrainError) as exc:
        run_timeline(vault, last="1d", types=["idea"])
    assert exc.value.code == "INVALID_TYPE"
