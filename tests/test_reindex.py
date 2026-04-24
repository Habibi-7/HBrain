from __future__ import annotations

from brain import cache
from brain.commands.add import run_add
from brain.commands.reindex import run_reindex


def test_reindex_rebuilds_from_vault(vault):
    run_add(vault, body="one", type_="note", stdin_fallback=False)
    run_add(vault, body="two", type_="task", stdin_fallback=False)

    # Nuke the cache; reindex should rebuild it.
    cache.cache_file(vault).unlink(missing_ok=True)

    out = run_reindex(vault)
    assert out.result["events_indexed"] == 2

    with cache.connect(vault) as conn:
        count = conn.execute("SELECT COUNT(*) FROM events").fetchone()[0]
    assert count == 2


def test_reindex_detects_deleted_files(vault):
    out1 = run_add(vault, body="alpha", type_="note", stdin_fallback=False)
    run_add(vault, body="beta", type_="note", stdin_fallback=False)

    # Delete the first event's file on disk.
    (vault / out1.result["path"]).unlink()

    run_reindex(vault)
    with cache.connect(vault) as conn:
        ids = [r[0] for r in conn.execute("SELECT id FROM events").fetchall()]
    assert out1.result["id"] not in ids
    assert len(ids) == 1


def test_reindex_detects_manual_edit(vault):
    out = run_add(vault, body="original", type_="note", stdin_fallback=False)
    path = vault / out.result["path"]
    text = path.read_text(encoding="utf-8")
    # Manually edit the body (keep frontmatter intact; `hash` is now stale).
    edited = text.rsplit("\n\n", 1)[0] + "\n\nedited in place\n"
    path.write_text(edited, encoding="utf-8")

    run_reindex(vault)
    with cache.connect(vault) as conn:
        row = conn.execute("SELECT title FROM events WHERE id = ?", (out.result["id"],)).fetchone()
    assert row is not None
    assert "edited in place" in row["title"]
