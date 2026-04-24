"""Event schema — the one thing to get right before building anything else.

The frontmatter `schema` key is handled outside the pydantic model so the model
stays minimal (pydantic v2 reserves `schema()` semantically). Migration logic
lives in `events.event_from_frontmatter`.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

SCHEMA_VERSION = 1


class EventType(StrEnum):
    NOTE = "note"
    TASK = "task"
    DECISION = "decision"
    FACT = "fact"
    LINK = "link"


class EventStatus(StrEnum):
    OPEN = "open"
    DONE = "done"
    BLOCKED = "blocked"
    CANCELLED = "cancelled"


ALLOWED_SOURCES = {"cli", "email", "voice", "screenshot", "manual", "forward", "import"}


class Event(BaseModel):
    """A single captured event. Matches the markdown file 1:1 minus `schema` key."""

    model_config = ConfigDict(extra="forbid")

    id: str
    type: EventType
    created_at: datetime
    ingested_at: datetime
    source: str = "cli"
    agent: str = "unknown"
    tags: list[str] = Field(default_factory=list)
    links: list[str] = Field(default_factory=list)
    status: EventStatus | None = None
    hash: str
    body: str = ""
