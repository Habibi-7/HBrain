from __future__ import annotations

from datetime import datetime, timezone

UTC = timezone.utc

import pytest

from brain.commands.add import run_add
from brain.errors import BrainError
from brain.events import read_event


def test_add_basic(vault):
    out = run_add(vault, body="hello world", type_="note", stdin_fallback=False)
    assert out.result["type"] == "note"
    assert out.result["title"] == "hello world"
    assert out.result["path"].startswith("events/")
    # File exists and round-trips
    ev_path = vault / out.result["path"]
    assert ev_path.exists()
    ev = read_event(ev_path)
    assert ev.body.strip() == "hello world"
    assert ev.tags == []


def test_add_task_defaults_to_open(vault):
    out = run_add(vault, body="do the thing", type_="task", stdin_fallback=False)
    assert out.result["status"] == "open"


def test_add_status_without_task_rejected(vault):
    with pytest.raises(BrainError) as exc:
        run_add(vault, body="x", type_="note", status="done", stdin_fallback=False)
    assert exc.value.code == "STATUS_WITHOUT_TASK"


def test_add_invalid_type(vault):
    with pytest.raises(BrainError) as exc:
        run_add(vault, body="x", type_="idea", stdin_fallback=False)
    assert exc.value.code == "INVALID_TYPE"


def test_add_invalid_source(vault):
    with pytest.raises(BrainError) as exc:
        run_add(vault, body="x", type_="note", source="carrier-pigeon", stdin_fallback=False)
    assert exc.value.code == "INVALID_SOURCE"


def test_add_empty_body_rejected(vault):
    with pytest.raises(BrainError) as exc:
        run_add(vault, body="   ", type_="note", stdin_fallback=False)
    assert exc.value.code == "EMPTY_BODY"


def test_add_voice_not_implemented(vault, tmp_path):
    fake = tmp_path / "audio.m4a"
    fake.write_bytes(b"fake")
    with pytest.raises(BrainError) as exc:
        run_add(vault, voice=fake, type_="note", stdin_fallback=False)
    assert exc.value.code == "NOT_IMPLEMENTED"


def test_add_file_source(vault, tmp_path):
    p = tmp_path / "note.md"
    p.write_text("from a file\n\nbody text", encoding="utf-8")
    out = run_add(vault, file=p, type_="note", stdin_fallback=False)
    ev_path = vault / out.result["path"]
    ev = read_event(ev_path)
    assert "from a file" in ev.body


def test_add_tags_and_links(vault):
    out = run_add(
        vault,
        body="linked event",
        type_="note",
        tags=["research", "agents"],
        links=["01K000000000000000000000AA"],
        stdin_fallback=False,
    )
    ev = read_event(vault / out.result["path"])
    assert ev.tags == ["research", "agents"]
    assert ev.links == ["01K000000000000000000000AA"]


def test_add_overridden_created_at(vault):
    ts = datetime(2025, 1, 15, 9, 30, tzinfo=UTC)
    out = run_add(
        vault,
        body="backfilled",
        type_="note",
        created_at=ts,
        stdin_fallback=False,
    )
    # File path is date-partitioned by created_at
    assert "/2025/01/15/" in out.result["path"]


def test_add_writes_audit_log(vault):
    run_add(vault, body="audited", type_="note", stdin_fallback=False)
    audit_files = list((vault / "audit").glob("*.jsonl"))
    assert audit_files, "audit log should have been created"
    contents = audit_files[0].read_text(encoding="utf-8").strip()
    assert '"command": "brain add"' in contents
    assert '"outcome": "ok"' in contents
