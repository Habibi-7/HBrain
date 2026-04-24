"""SQLite cache — a derivative index, rebuildable from the markdown vault.

Holds one row per event, mirroring the fields needed for fast timeline /
filter queries (no full-text search in MVP). The `.brain/cache.sqlite` file
can be deleted at any time and rebuilt via `brain reindex`.

Edit detection is lazy-on-query: when a command reads an event, it compares
the cached `hash` against the current content hash and upserts if different.
"""

from __future__ import annotations

import json
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timezone

UTC = timezone.utc
from pathlib import Path

from .events import (
    content_hash,
    event_title,
    iter_event_paths,
    read_event,
)
from .schema import Event

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id           TEXT PRIMARY KEY,
    type         TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    ingested_at  TEXT NOT NULL,
    source       TEXT,
    agent        TEXT,
    tags         TEXT NOT NULL,   -- json array
    links        TEXT NOT NULL,   -- json array
    status       TEXT,
    hash         TEXT NOT NULL,
    path         TEXT NOT NULL,   -- relative to vault root
    title        TEXT NOT NULL,
    mtime_ns     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_type       ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_hash       ON events(hash);
"""

CACHE_VERSION = "1"


def cache_file(vault: Path) -> Path:
    return vault / ".brain" / "cache.sqlite"


@contextmanager
def connect(vault: Path) -> Iterator[sqlite3.Connection]:
    path = cache_file(vault)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, detect_types=sqlite3.PARSE_DECLTYPES)
    conn.row_factory = sqlite3.Row
    try:
        conn.executescript(SCHEMA_SQL)
        conn.execute(
            "INSERT OR IGNORE INTO meta(key, value) VALUES ('version', ?)",
            (CACHE_VERSION,),
        )
        yield conn
        conn.commit()
    finally:
        conn.close()


def upsert(
    conn: sqlite3.Connection,
    ev: Event,
    path: Path,
    vault_root: Path,
    mtime_ns: int,
) -> None:
    conn.execute(
        """
        INSERT INTO events
            (id, type, created_at, ingested_at, source, agent, tags, links, status,
             hash, path, title, mtime_ns)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            type        = excluded.type,
            created_at  = excluded.created_at,
            ingested_at = excluded.ingested_at,
            source      = excluded.source,
            agent       = excluded.agent,
            tags        = excluded.tags,
            links       = excluded.links,
            status      = excluded.status,
            hash        = excluded.hash,
            path        = excluded.path,
            title       = excluded.title,
            mtime_ns    = excluded.mtime_ns
        """,
        (
            ev.id,
            ev.type.value,
            ev.created_at.astimezone(UTC).isoformat(),
            ev.ingested_at.astimezone(UTC).isoformat(),
            ev.source,
            ev.agent,
            json.dumps(list(ev.tags)),
            json.dumps(list(ev.links)),
            ev.status.value if ev.status is not None else None,
            ev.hash,
            str(path.relative_to(vault_root)),
            event_title(ev.body),
            mtime_ns,
        ),
    )


def delete_missing(conn: sqlite3.Connection, alive_ids: set[str]) -> int:
    if not alive_ids:
        conn.execute("DELETE FROM events")
        return conn.total_changes
    placeholders = ",".join("?" for _ in alive_ids)
    cur = conn.execute(
        f"DELETE FROM events WHERE id NOT IN ({placeholders})",
        tuple(alive_ids),
    )
    return cur.rowcount or 0


def refresh_from_path(conn: sqlite3.Connection, vault_root: Path, path: Path) -> Event | None:
    """Re-read an event file and upsert if its hash differs from the cached row."""
    ev = read_event(path)
    expected_hash = content_hash(ev.body)
    if expected_hash != ev.hash:
        # File was edited in place; the `hash` frontmatter is stale.
        # Update the in-memory event so the cache reflects truth on disk.
        ev = ev.model_copy(update={"hash": expected_hash})
    st = path.stat()
    upsert(conn, ev, path, vault_root, st.st_mtime_ns)
    return ev


def rebuild(vault: Path) -> int:
    """Walk the events folder and rebuild the cache from scratch. Returns count."""
    with connect(vault) as conn:
        alive: set[str] = set()
        count = 0
        for p in iter_event_paths(vault):
            ev = refresh_from_path(conn, vault, p)
            if ev is not None:
                alive.add(ev.id)
                count += 1
        delete_missing(conn, alive)
        conn.execute(
            "INSERT INTO meta(key, value) VALUES('last_reindex', ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (datetime.now(UTC).isoformat(),),
        )
        return count


def query_range(
    conn: sqlite3.Connection,
    *,
    since_iso: str,
    until_iso: str,
    types: list[str] | None = None,
    tag: str | None = None,
    limit: int | None = None,
) -> list[sqlite3.Row]:
    sql = [
        "SELECT id, type, created_at, source, agent, tags, links, status, hash, path, title",
        "FROM events",
        "WHERE created_at >= ? AND created_at < ?",
    ]
    params: list = [since_iso, until_iso]
    if types:
        sql.append(f"AND type IN ({','.join('?' for _ in types)})")
        params.extend(types)
    if tag:
        # tags is a json array — do a substring match on the json text.
        sql.append("AND tags LIKE ?")
        params.append(f'%"{tag}"%')
    sql.append("ORDER BY created_at ASC, id ASC")
    if limit is not None:
        sql.append("LIMIT ?")
        params.append(limit)
    cur = conn.execute(" ".join(sql), tuple(params))
    return cur.fetchall()
