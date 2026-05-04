# brain — Living Second Brain

A skill + CLI that teaches your agent to capture thoughts, tasks, and decisions as plain markdown files you own — and query them later.

## Install

One line. Auto-detects your agent platform and installs the skill + `brain` CLI.

**Private repo (gh already authed):**
```bash
gh api -H "Accept: application/vnd.github.v3.raw" /repos/Habibi-7/living-brain/contents/install.sh | sh
```

**Public repo:**
```bash
curl -fsSL https://raw.githubusercontent.com/Habibi-7/living-brain/main/install.sh | sh
```

The installer detects `~/.claude`, `.cursor/`, `.windsurf/`, `.github/` and puts the skill in the right place. It also installs the `brain` CLI via `go install`.

**Force a specific platform:**
```bash
... | sh -s -- --cursor    # Cursor
... | sh -s -- --claude    # Claude Code / Cowork
... | sh -s -- --windsurf  # Windsurf
... | sh -s -- --copilot   # GitHub Copilot
```

## First use

After install, just talk to your agent. First time it will ask where to keep your vault (default: `~/brain`). Then:

```
"remember that we chose Tailwind over plain CSS"   →  ✓ decision saved
"remind me to review the auth PR"                  →  ✓ task · open
"what did I decide about the database?"            →  decision · May 4 · Chose Postgres...
"show my week"                                     →  opens timeline in browser
"my open tasks"                                    →  3 open tasks: ...
```

## brain CLI

For richer views, use the `brain` binary directly:

```bash
brain stats                # vault overview: counts, types, top tags
brain tasks                # open tasks (default)
brain tasks all            # all tasks by status
brain search postgres      # full-text + tag search
brain stale 14             # open/blocked tasks older than 14 days
brain timeline             # open HTML timeline in browser (default: 7 days)
brain timeline 30          # last 30 days
```

Set `BRAIN_DIR` if your vault is not at `~/brain`:
```bash
export BRAIN_DIR=~/Dropbox/brain
```

## How it works

```
You speak naturally
  → Agent captures structured markdown files to ~/brain/events/
  → brain CLI reads vault, produces views
```

The skill teaches your agent:
- **Schema** — 5 event types: `note` `task` `decision` `fact` `link`
- **Capture** — write one file per thought, use your exact words
- **Query** — find, filter, aggregate using file tools
- **Views** — render using strict templates

## Vault structure

```
~/brain/
├── events/
│   └── YYYY/MM/DD/
│       └── <ulid>-<slug>.md    # one file per thought
├── renders/
└── .brain/
    └── templates/
        └── timeline.html
```

Each event:
```markdown
---
id: 01JVMY7QXR8KF3DNQJ5CGPXG9S
schema: 1
type: decision
created_at: 2026-05-04T14:32:11Z
source: agent
agent: cursor
tags: [backend, database]
---

Chose Postgres over Mongo — native JSON support and ACID guarantees.
```

## Platform support

| Platform | Install path |
|----------|-------------|
| Claude Code / Cowork | `~/.claude/skills/brain.md` |
| Cursor | `.cursor/rules/brain.mdc` |
| Windsurf | `.windsurf/rules/brain.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Any agent | `platforms/system-prompt.md` → paste into system prompt |

See [`platforms/`](./platforms/) for per-platform files.

## Vision

See [CONTEXT.md](./CONTEXT.md).
