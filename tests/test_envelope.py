from __future__ import annotations

import io

import pytest

from brain.envelope import (
    Metrics,
    NextAction,
    detect_agent_mode,
    error_envelope,
    human_footer,
    success_envelope,
)


def test_detect_agent_mode_default_with_tty(monkeypatch):
    # Simulate a tty on stdout
    class _TTY:
        def isatty(self):
            return True

    monkeypatch.setattr("sys.stdout", _TTY())
    assert detect_agent_mode() is False


def test_detect_agent_mode_env_var_wins(monkeypatch):
    class _TTY:
        def isatty(self):
            return True

    monkeypatch.setattr("sys.stdout", _TTY())
    monkeypatch.setenv("CLAUDECODE", "1")
    assert detect_agent_mode() is True


def test_detect_agent_mode_non_tty(monkeypatch):
    class _NotTTY:
        def isatty(self):
            return False

    monkeypatch.setattr("sys.stdout", _NotTTY())
    assert detect_agent_mode() is True


def test_detect_agent_mode_force_text_overrides_env(monkeypatch):
    monkeypatch.setenv("CLAUDECODE", "1")
    assert detect_agent_mode(force_text=True) is False


def test_detect_agent_mode_force_agent_overrides_all():
    assert detect_agent_mode(force_agent=True) is True


def test_success_envelope_shape():
    env = success_envelope(
        command="brain add",
        result={"id": "X"},
        next_actions=[NextAction("brain show <id>", "read", {"id": {"value": "X"}})],
        metrics=Metrics(duration_ms=10, cost_usd=0.0),
    )
    assert env["ok"] is True
    assert env["command"] == "brain add"
    assert env["result"] == {"id": "X"}
    assert env["next_actions"][0]["command"] == "brain show <id>"
    assert env["next_actions"][0]["params"] == {"id": {"value": "X"}}
    assert env["metrics"]["duration_ms"] == 10


def test_error_envelope_shape():
    env = error_envelope(
        command="brain add",
        code="EMPTY_BODY",
        message="No body",
        fix="Pass something",
        next_actions=[],
        metrics=Metrics(duration_ms=2),
        retryable=False,
    )
    assert env["ok"] is False
    assert env["error"]["code"] == "EMPTY_BODY"
    assert env["error"]["retryable"] is False
    assert env["fix"] == "Pass something"


def test_human_footer_format():
    m = Metrics(duration_ms=2400, cost_usd=0.02)
    s = human_footer(m, 0, artifact="timeline-2026-W17.md")
    assert s.startswith("[")
    assert s.endswith("]")
    assert "exit: 0" in s
    assert "2.40s" in s
    assert "$0.02" in s
    assert "artifact: timeline-2026-W17.md" in s
