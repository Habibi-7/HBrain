from __future__ import annotations

import pytest

from brain.commands.add import run_add
from brain.commands.show import run_show
from brain.errors import BrainError


def test_show_roundtrip(vault):
    captured = run_add(vault, body="to be shown", type_="note", stdin_fallback=False)
    ev_id = captured.result["id"]
    out = run_show(vault, ev_id)
    assert out.result["id"] == ev_id
    assert out.result["body"].strip() == "to be shown"
    assert out.result["type"] == "note"


def test_show_by_prefix(vault):
    captured = run_add(vault, body="prefix demo", type_="note", stdin_fallback=False)
    ev_id = captured.result["id"]
    out = run_show(vault, ev_id[:10])
    assert out.result["id"] == ev_id


def test_show_missing(vault):
    with pytest.raises(BrainError) as exc:
        run_show(vault, "NOT_A_REAL_ID_00000000000")
    assert exc.value.code == "EVENT_NOT_FOUND"
