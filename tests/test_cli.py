"""Smoke tests for the CLI layer — envelope shape, exit codes, agent-mode switch."""

from __future__ import annotations

import json
from pathlib import Path

from typer.testing import CliRunner

from brain.cli import app

runner = CliRunner()


def _run(args: list[str], env: dict[str, str] | None = None):
    """Invoke the CLI with given env (augmenting the runner's)."""
    full_env = {"BRAIN_FORCE_TEXT": "0"}
    if env:
        full_env.update(env)
    return runner.invoke(app, args, env=full_env)


def test_root_command_tree_agent_mode(tmp_path):
    res = _run(["--agent"])
    assert res.exit_code == 0
    env = json.loads(res.stdout)
    assert env["ok"] is True
    assert env["command"] == "brain"
    names = [c["name"] for c in env["result"]["commands"]]
    assert {"init", "add", "show", "timeline", "reindex"}.issubset(set(names))


def test_init_add_show_agent_mode(tmp_path):
    v = tmp_path / "v"
    res = _run(["--agent", "init", str(v)])
    assert res.exit_code == 0, res.stdout
    env = json.loads(res.stdout)
    assert env["ok"] is True
    assert env["result"]["already_initialized"] is False

    res = _run(
        ["--agent", "--vault", str(v), "add", "hello agent mode", "--type", "note"],
    )
    assert res.exit_code == 0, res.stdout
    env = json.loads(res.stdout)
    assert env["ok"] is True
    ev_id = env["result"]["id"]

    res = _run(["--agent", "--vault", str(v), "show", ev_id])
    assert res.exit_code == 0
    env = json.loads(res.stdout)
    assert env["ok"] is True
    assert env["result"]["id"] == ev_id


def test_error_envelope_on_missing_vault(tmp_path):
    res = _run(["--agent", "--vault", str(tmp_path / "nope"), "timeline"])
    assert res.exit_code == 4  # ExitCode.NO_VAULT
    env = json.loads(res.stdout)
    assert env["ok"] is False
    assert env["error"]["code"] == "NO_VAULT"
    assert "brain init" in env["fix"]


def test_invalid_type_error_envelope(tmp_path):
    v = tmp_path / "v"
    _run(["--agent", "init", str(v)])
    res = _run(["--agent", "--vault", str(v), "add", "hi", "--type", "idea"])
    assert res.exit_code == 2
    env = json.loads(res.stdout)
    assert env["ok"] is False
    assert env["error"]["code"] == "INVALID_TYPE"


def test_text_mode_human_footer(tmp_path):
    v = tmp_path / "v"
    _run(["--text", "init", str(v)])
    res = _run(["--text", "--vault", str(v), "add", "from a human", "--type", "note"])
    assert res.exit_code == 0
    # Last line should be the human footer
    last = res.stdout.strip().splitlines()[-1]
    assert last.startswith("[") and last.endswith("]")
    assert "exit: 0" in last
