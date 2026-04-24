from __future__ import annotations

from pathlib import Path

import pytest

from brain.commands.init import run_init

_AGENT_ENVS = (
    "CLAUDECODE",
    "CURSOR_TRACE_ID",
    "COPILOT_AGENT_ENABLED",
    "GITHUB_COPILOT_TOKEN",
    "AIDER_MODEL",
    "AIDER_CHAT_HISTORY_FILE",
    "OPENCODE",
    "COWORK",
    "MANUS",
    "BRAIN_AGENT",
    "BRAIN_FORCE_TEXT",
)


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch):
    """Keep test env free of agent-mode signals and any BRAIN_DIR leakage."""
    for k in _AGENT_ENVS:
        monkeypatch.delenv(k, raising=False)
    monkeypatch.delenv("BRAIN_DIR", raising=False)


@pytest.fixture
def vault(tmp_path: Path) -> Path:
    v = tmp_path / "vault"
    run_init(v)
    return v
