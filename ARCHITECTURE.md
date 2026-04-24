# Architecture

The current shape of the code. Companion to [`CONTEXT.md`](./CONTEXT.md) (vision) and [`README.md`](./README.md) (install + usage).

This file is **the map**. Keep it current; keep it short.

---

## One-paragraph model

Input comes in through `brain add`. A domain function validates it, writes a markdown file with YAML frontmatter, mirrors it into a SQLite cache, and appends a line to an audit log. Query commands (`show`, `timeline`) read from the cache, fall back to the filesystem, and emit either a JSON envelope (for agents) or a clean text view (for humans). The markdown folder is the source of truth; the cache is derivative and rebuildable with `brain reindex`.

## Data flow

```
 caller (agent or human)
        │
        ▼
  brain CLI (src/brain/cli.py)
   • flag parsing, agent-mode detection, envelope + footer
        │  calls a domain function
        ▼
  commands/<verb>.py            ──┐
   • pure-ish business logic      │ uses
        │                         │
        ▼                         ▼
    events.py / cache.py / audit.py / render.py
        │
        ▼
             the vault on disk
```

Two rules this diagram encodes:

1. **The CLI never touches the vault directly.** All I/O goes through `events` / `cache` / `audit` / `render`. This keeps the CLI a thin presentation layer.
2. **Commands never format output.** They return a `CommandOutput`; the CLI decides JSON vs text.

## Module map

| Module | Owns |
| --- | --- |
| `brain/cli.py` | Typer app, agent-mode detection, envelope emission, exit codes, footer |
| `brain/envelope.py` | Envelope shape, `NextAction`, `Metrics`, `CommandOutput`, human footer |
| `brain/errors.py` | `BrainError` + `ExitCode` enum |
| `brain/schema.py` | `Event` (pydantic), `EventType`, `EventStatus`, allowed sources, `SCHEMA_VERSION` |
| `brain/events.py` | File I/O: ULID, hash, slug, paths, frontmatter (de)serialize, write/read/find/validate |
| `brain/cache.py` | SQLite schema, upsert, query, rebuild-from-vault |
| `brain/audit.py` | Append-only JSONL write log |
| `brain/render.py` | Timeline markdown renderer, range slug (`2026-W17` / date / date-range) |
| `brain/config.py` | Vault discovery: `--vault` → `$BRAIN_DIR` → walk-up for `.brain/` marker |
| `brain/commands/*.py` | One file per verb. Each exports a single `run_<verb>(...)` returning `CommandOutput` |

## Vault on disk

```
vault/
├── events/YYYY/MM/DD/<ulid>-<slug>.md   # source of truth
├── renders/timelines/<range>.md         # derived artifacts
├── audit/YYYY-MM-DD.jsonl               # append-only write log
└── .brain/
    ├── config.toml                      # vault marker + schema version
    └── cache.sqlite                     # derivative index (deletable)
```

Event file shape (frontmatter + body):

```yaml
id: 01K...ULID          # also the filename prefix
schema: 1
type: note | task | decision | fact | link
created_at: ISO-8601 UTC
ingested_at: ISO-8601 UTC
source: cli | email | voice | screenshot | manual | forward | import
agent: <free text>
tags: [..]
links: [<event_id>, ..]
status: open | done | blocked | cancelled   # tasks only
hash: sha256:<digest of body>
```

## The envelope contract

Every command returns this shape when an agent is detected (flag, env var, or non-tty stdout):

```
success: { ok: true,  command, result, next_actions[], metrics }
error:   { ok: false, command, error{code,message,retryable}, fix, next_actions[], metrics }
```

`next_actions[i]` uses POSIX templates: `<positional>` and `[--flag <val>]`. `params` may carry `value`, `default`, `enum`, `description` — the hypermedia controls that let the agent fill the template without guessing.

Exit codes: `0` success · `2` user error · `3` retryable · `4` no vault · `1` unexpected.

## Event lifecycle

```
add  →  validate type / source / body  →  build Event (new ULID, hash body)
     →  write event file (atomic, tmp+rename)
     →  cache.upsert
     →  audit.append
     →  return CommandOutput with next_actions
```

Query path:

```
timeline  →  parse range/filters
          →  ensure cache is non-empty (rebuild if needed)
          →  cache.query_range
          →  (optional) render markdown artifact
          →  return CommandOutput
```

Reindex path: walk `events/`, read each file, repair stale `hash` frontmatter against the actual body, upsert into cache, delete orphan cache rows.

## Where to change things

- **Add a new CLI verb** → new file in `commands/`, register in `cli.py` under `@app.command(...)`, add an entry to `_COMMAND_TREE`.
- **Add an event type** → `EventType` enum in `schema.py`. Frontmatter and queries pick it up automatically.
- **Add a new source channel** (voice/image/email, etc.) → `ALLOWED_SOURCES` in `schema.py`, wire the ingestion in `commands/add.py` (currently stubbed with `NOT_IMPLEMENTED`).
- **Change the envelope** → `envelope.py`. Update README's "CLI contract" section. This is a public contract — bump with care.
- **Add a new render surface** → new module next to `render.py`, new command in `commands/`. Keep `<vault>/renders/<kind>/` as the artifact location.
- **Add a new query filter** → extend `cache.query_range` and the `timeline` command flags together.

## Invariants

Break any of these and the system lies to the user. Don't.

1. **The markdown folder is truth.** Any index/cache/render is derivative and rebuildable from `events/`.
2. **Every write is atomic and audited.** Write via tmp-then-rename; append to `audit/<date>.jsonl`.
3. **`id` and `created_at` never change** once an event is written. Edits replace body + recompute `hash`; they do not mint new ids.
4. **The CLI has two output modes, same data.** Agent JSON envelope and human text view come from the same `CommandOutput`. They never diverge in facts.
5. **Errors always carry a `fix`.** If you raise `BrainError`, you owe the caller a one-sentence action hint.
6. **Commands are pure-ish.** No `print`, no `sys.exit`, no envelope concerns — return `CommandOutput` or raise `BrainError`.
7. **No long-running processes.** The CLI is the only entry point; there is no daemon.

## Tests

- `tests/` mirrors modules one-for-one. Adding a new command means adding `tests/test_<verb>.py`.
- `tests/conftest.py` scrubs agent env vars and provides a `vault` fixture that runs `init` in a `tmp_path`.
- `tests/test_cli.py` is the envelope / exit-code smoke layer (invokes the real Typer app via `CliRunner`).

---

## How to update this file

`ARCHITECTURE.md` changes **after** the code change is approved, and **only with the user's approval of the edit to this file specifically**. The flow:

1. Make the code change.
2. Propose the ARCHITECTURE.md diff separately, explaining what shifted in the mental model (not the code).
3. Wait for approval before applying.
4. Prefer deletion over addition. If a new section doesn't earn its space, it doesn't go in.

Good edits clarify the mental model. They don't catalog every file or re-describe every function — the code is already there for that.
