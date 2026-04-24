from __future__ import annotations

from datetime import UTC, datetime, timezone

from brain.events import (
    content_hash,
    event_from_frontmatter,
    event_path,
    event_title,
    event_to_frontmatter,
    find_event_path_by_id,
    make_slug,
    new_ulid,
    read_event,
    write_event,
)
from brain.schema import Event, EventStatus, EventType


def _make_event(body: str = "hello world", type_: EventType = EventType.NOTE) -> Event:
    now = datetime(2026, 4, 24, 14, 32, 11, tzinfo=UTC)
    return Event(
        id=new_ulid(),
        type=type_,
        created_at=now,
        ingested_at=now,
        source="cli",
        agent="test",
        tags=["a", "b"],
        links=[],
        status=None,
        hash=content_hash(body),
        body=body,
    )


def test_slug_basic():
    assert make_slug("reviewed the hugentobler essay") == "reviewed-the-hugentobler-essay"
    assert make_slug("# A Heading With Punctuation!!") == "a-heading-with-punctuation"
    assert make_slug("   \n\n- [ ] do the thing") == "do-the-thing"
    assert make_slug("") == "event"


def test_slug_max_len():
    s = make_slug("a" * 200)
    assert len(s) <= 48


def test_event_title_first_meaningful_line():
    assert event_title("hello\nworld") == "hello"
    assert event_title("") == "(empty)"
    assert event_title("# Title\n\nbody") == "Title"


def test_content_hash_deterministic():
    h1 = content_hash("abc")
    h2 = content_hash("abc")
    assert h1 == h2
    assert h1.startswith("sha256:")
    assert content_hash("abcd") != h1


def test_event_path_date_partitioned(tmp_path):
    ev = _make_event()
    p = event_path(tmp_path, ev)
    assert p.parent == tmp_path / "events" / "2026" / "04" / "24"
    assert p.name.startswith(f"{ev.id}-")
    assert p.suffix == ".md"


def test_frontmatter_roundtrip():
    ev = _make_event("line one\nline two", EventType.DECISION)
    fm = event_to_frontmatter(ev)
    assert fm["schema"] == 1
    assert fm["type"] == "decision"
    assert fm["id"] == ev.id
    assert fm["created_at"].endswith("Z")
    back = event_from_frontmatter(fm, ev.body)
    assert back.id == ev.id
    assert back.type == EventType.DECISION
    assert back.tags == ev.tags
    assert back.body == ev.body


def test_frontmatter_task_status_roundtrip():
    ev = _make_event("do the thing", EventType.TASK)
    ev_with_status = ev.model_copy(update={"status": EventStatus.OPEN})
    fm = event_to_frontmatter(ev_with_status)
    assert fm["status"] == "open"
    back = event_from_frontmatter(fm, ev_with_status.body)
    assert back.status == EventStatus.OPEN


def test_write_and_read_event(tmp_path):
    ev = _make_event("the body here")
    path = write_event(tmp_path, ev)
    assert path.exists()
    text = path.read_text(encoding="utf-8")
    assert text.startswith("---\n")
    assert "the body here" in text

    back = read_event(path)
    assert back.id == ev.id
    assert back.body.strip() == ev.body.strip()
    assert back.hash == ev.hash


def test_find_event_path_by_id(tmp_path):
    ev = _make_event("find me please")
    path = write_event(tmp_path, ev)
    assert find_event_path_by_id(tmp_path, ev.id) == path
    # Prefix lookup
    assert find_event_path_by_id(tmp_path, ev.id[:10]) == path


def test_find_event_path_missing(tmp_path):
    (tmp_path / "events").mkdir()
    assert find_event_path_by_id(tmp_path, "NOPE") is None
