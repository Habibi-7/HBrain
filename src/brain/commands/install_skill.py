"""`brain install-skill` — drop the bundled Claude skill into ~/.claude/skills/."""

from __future__ import annotations

from importlib import resources
from pathlib import Path

from ..envelope import CommandOutput, NextAction
from ..errors import BrainError, ExitCode

SKILL_NAME = "brain"
SKILL_FILENAME = "SKILL.md"


def _user_scope_dir() -> Path:
    return Path.home() / ".claude" / "skills" / SKILL_NAME


def _project_scope_dir(cwd: Path) -> Path:
    return cwd / ".claude" / "skills" / SKILL_NAME


def run_install_skill(
    *,
    scope: str = "user",
    path: Path | None = None,
    force: bool = False,
    cwd: Path | None = None,
) -> CommandOutput:
    if path is not None:
        dest_dir = path.expanduser().resolve()
    elif scope == "user":
        dest_dir = _user_scope_dir()
    elif scope == "project":
        dest_dir = _project_scope_dir(cwd or Path.cwd())
    else:
        raise BrainError(
            code="INVALID_SCOPE",
            message=f"Unknown scope '{scope}'.",
            fix="Use --scope user | project, or pass --path <dir> explicitly.",
        )

    dest_file = dest_dir / SKILL_FILENAME

    try:
        bundled = resources.files("brain.skills.brain").joinpath(SKILL_FILENAME)
        skill_text = bundled.read_text(encoding="utf-8")
    except (FileNotFoundError, ModuleNotFoundError) as e:
        raise BrainError(
            code="SKILL_NOT_BUNDLED",
            message=f"Could not locate bundled skill: {e}",
            fix="Reinstall living-brain: `pip install --force-reinstall living-brain`.",
            exit_code=ExitCode.UNEXPECTED,
        ) from None

    already_exists = dest_file.exists()
    if already_exists and not force:
        raise BrainError(
            code="SKILL_ALREADY_INSTALLED",
            message=f"Skill already exists at {dest_file}.",
            fix="Pass --force to overwrite, or remove the existing file first.",
        )

    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_file.write_text(skill_text, encoding="utf-8")

    result = {
        "installed": True,
        "scope": "custom" if path is not None else scope,
        "path": str(dest_file),
        "overwritten": already_exists,
    }
    next_actions = [
        NextAction(
            command="brain init <path>",
            description="Create a vault so the skill has somewhere to write",
        ),
        NextAction(
            command="export BRAIN_DIR=<vault-path>",
            description="Point brain at your vault in new shells",
        ),
    ]
    summary = (
        f"{'Overwrote' if already_exists else 'Installed'} skill at {dest_file}\n"
        "Restart Claude Code / Cowork so it picks up the new skill."
    )
    return CommandOutput(result=result, next_actions=next_actions, human_summary=summary)
