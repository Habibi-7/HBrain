"""Response envelope and agent-mode detection.

Shape follows the joelclaw HATEOAS pattern:
    { ok, command, result|error, fix?, next_actions[{command, description, params?}], metrics }

`next_actions` use POSIX template syntax: <positional> and [--flag <value>].
`params` optionally carry `value` (pre-filled), `default`, `enum`, `description`.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from typing import Any

# Environment signals used by common agent harnesses.
# Presence of ANY one of these flips us to JSON-envelope mode.
_AGENT_ENV_VARS: tuple[str, ...] = (
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
)


def detect_agent_mode(force_agent: bool = False, force_text: bool = False) -> bool:
    """Return True when the caller should receive a JSON envelope.

    Priority:
        --agent flag (force_agent) > --text flag (force_text)
            > BRAIN_FORCE_TEXT=1 > env var detection > tty check
    """
    if force_agent:
        return True
    if force_text:
        return False
    if os.environ.get("BRAIN_FORCE_TEXT") == "1":
        return False
    for v in _AGENT_ENV_VARS:
        if os.environ.get(v):
            return True
    # Non-tty stdout usually means piped/programmatic use.
    if not sys.stdout.isatty():
        return True
    return False


@dataclass
class NextAction:
    command: str
    description: str
    params: dict[str, dict[str, Any]] | None = None

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "command": self.command,
            "description": self.description,
        }
        if self.params:
            out["params"] = self.params
        return out


@dataclass
class Metrics:
    duration_ms: int = 0
    cost_usd: float = 0.0
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "duration_ms": self.duration_ms,
            "cost_usd": self.cost_usd,
        }
        out.update(self.extra)
        return out


def success_envelope(
    command: str,
    result: dict[str, Any],
    next_actions: list[NextAction],
    metrics: Metrics,
) -> dict[str, Any]:
    return {
        "ok": True,
        "command": command,
        "result": result,
        "next_actions": [a.to_dict() for a in next_actions],
        "metrics": metrics.to_dict(),
    }


def error_envelope(
    command: str,
    code: str,
    message: str,
    fix: str,
    next_actions: list[NextAction],
    metrics: Metrics,
    retryable: bool = False,
) -> dict[str, Any]:
    return {
        "ok": False,
        "command": command,
        "error": {"code": code, "message": message, "retryable": retryable},
        "fix": fix,
        "next_actions": [a.to_dict() for a in next_actions],
        "metrics": metrics.to_dict(),
    }


@dataclass
class CommandOutput:
    """What a command returns to the CLI presentation layer.

    `result` and `next_actions` populate the JSON envelope.
    `human_summary` is plain text shown in --text mode.
    `artifact_path` (if any) lands in the human footer as `artifact: ...`.
    """

    result: dict[str, Any]
    next_actions: list[NextAction] = field(default_factory=list)
    human_summary: str = ""
    artifact_path: str | None = None


def human_footer(metrics: Metrics, exit_code: int, artifact: str | None = None) -> str:
    """Return footer matching the design doc: [exit: 0 | 2.4s | $0.02 | artifact: ...]"""
    duration_s = metrics.duration_ms / 1000
    parts = [f"exit: {exit_code}", f"{duration_s:.2f}s", f"${metrics.cost_usd:.2f}"]
    if artifact:
        parts.append(f"artifact: {artifact}")
    return "[" + " | ".join(parts) + "]"
