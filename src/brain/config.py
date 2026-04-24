"""Vault discovery.

Precedence:
    1. Explicit --vault argument
    2. BRAIN_DIR environment variable
    3. Walk up from cwd looking for a `.brain/` marker directory (git-style)
"""

from __future__ import annotations

import os
from pathlib import Path

from .errors import BrainError, ExitCode

VAULT_MARKER = ".brain"


def _has_marker(p: Path) -> bool:
    return (p / VAULT_MARKER).is_dir()


def find_vault(explicit: Path | None = None) -> Path:
    if explicit is not None:
        p = explicit.expanduser().resolve()
        if _has_marker(p):
            return p
        raise BrainError(
            code="NO_VAULT",
            message=f"No vault at {p}",
            fix=f"Run: brain init {p}",
            exit_code=ExitCode.NO_VAULT,
        )

    env = os.environ.get("BRAIN_DIR")
    if env:
        p = Path(env).expanduser().resolve()
        if _has_marker(p):
            return p
        raise BrainError(
            code="NO_VAULT",
            message=f"BRAIN_DIR={env} but no vault is there",
            fix=f"Run: brain init {p}",
            exit_code=ExitCode.NO_VAULT,
        )

    start = Path.cwd().resolve()
    for p in [start, *start.parents]:
        if _has_marker(p):
            return p

    raise BrainError(
        code="NO_VAULT",
        message="No vault found.",
        fix="Run `brain init <path>` to create one, or set BRAIN_DIR.",
        exit_code=ExitCode.NO_VAULT,
    )
