"""`brain reindex` — rebuild the SQLite cache from the markdown vault.

The cache is strictly derivative. Deleting `.brain/cache.sqlite` is always
safe; `brain reindex` recreates it. Useful after manual edits to many files.
"""

from __future__ import annotations

from pathlib import Path

from .. import audit, cache
from ..envelope import CommandOutput, NextAction


def run_reindex(vault: Path, agent: str = "unknown") -> CommandOutput:
    count = cache.rebuild(vault)

    audit.append(
        vault,
        command="brain reindex",
        event_id=None,
        event_path=None,
        outcome="ok",
        agent=agent,
        extra={"events_indexed": count},
    )

    result = {"events_indexed": count, "vault": str(vault)}
    next_actions = [
        NextAction(
            command="brain timeline",
            description="Query the freshly-built index",
        ),
    ]
    return CommandOutput(
        result=result,
        next_actions=next_actions,
        human_summary=f"Reindexed {count} event{'s' if count != 1 else ''}.",
    )
