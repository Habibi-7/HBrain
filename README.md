# brain — Living Second Brain (MVP)

Agent-native CLI for a markdown-backed event store. See [`CONTEXT.md`](./CONTEXT.md) for the product vision and principles.

This is the MVP covering the two foundational pieces: the **capture path + event schema**, and the **timeline retrieval surface**.

## Install

```bash
uv sync                 # create .venv and install deps
uv pip install -e .     # install the `brain` CLI into the venv
source .venv/bin/activate
```

Or with pip:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
```

## Quickstart

```bash
brain init ./my-vault               # scaffold a vault
export BRAIN_DIR=./my-vault          # point the CLI at it (or use --vault)

brain add "reviewed the hugentobler essay" --type note --tags research,agents
echo "use ULID for event ids" | brain add --type decision
brain add --file notes/meeting.md --type note

brain timeline --last 7d             # recent events
brain timeline --format md --write   # writes renders/timelines/<range>.md
```

## CLI contract (for agents)

Every command returns a JSON envelope when an agent is detected (`--agent` flag, or env var: `CLAUDECODE`, `CURSOR_TRACE_ID`, `COPILOT_AGENT_ENABLED`, `AIDER_*`, `OPENCODE`). Humans get a clean text view; under the hood it's the same data.

### Success envelope

```json
{
  "ok": true,
  "command": "brain add",
  "result": { "...": "command-specific payload" },
  "next_actions": [
    { "command": "brain show <id>", "description": "...",
      "params": { "id": { "value": "01K..." } } }
  ],
  "metrics": { "duration_ms": 34, "cost_usd": 0.0 }
}
```

### Error envelope

```json
{
  "ok": false,
  "command": "brain add",
  "error": { "code": "INVALID_TYPE", "message": "...", "retryable": false },
  "fix": "plain-language suggested fix",
  "next_actions": [ ... ],
  "metrics": { "duration_ms": 3, "cost_usd": 0.0 }
}
```

### Exit codes

- `0` — success
- `2` — validation / user error (retryable=false)
- `3` — transient / retryable error
- `4` — vault not found / not initialized
- `1` — unexpected error

## Event file shape

```
vault/
├── events/YYYY/MM/DD/<ulid>-<slug>.md
├── renders/timelines/<range>.md
├── audit/YYYY-MM-DD.jsonl
└── .brain/
    ├── config.toml
    └── cache.sqlite          # derivative, rebuildable with `brain reindex`
```

An event file:

```markdown
---
id: 01K...ULID
schema: 1
type: note
created_at: 2026-04-24T14:32:11Z
ingested_at: 2026-04-24T14:32:12Z
source: cli
agent: unknown
tags: [research, agents]
links: []
hash: sha256:...
---

the actual markdown body
```

## Event types (v0)

`note` · `task` · `decision` · `fact` · `link`

Add via `--type`. Classification subagent is deferred; current MVP requires explicit type (or defaults to `note`).

## Development

```bash
uv run pytest          # run the test suite
uv run ruff check      # lint
uv run ruff format     # format
```
