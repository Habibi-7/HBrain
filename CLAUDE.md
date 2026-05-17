# CLAUDE.md — instructions for agents working on this repo

This repo contains **HBrain** — a skill + CLI tool that captures and retrieves a markdown-backed knowledge and task system.

## Repo structure

```
skill/
├── SKILL.md              # THE SKILL — capture rules for agents
└── templates/
    └── timeline.html     # Handlebars-style view template (reference)
tool/                     # Go CLI — views/computation layer
├── cmd/brain/main.go     # entry point
├── internal/
│   ├── event/            # YAML frontmatter parser
│   ├── vault/            # vault discovery + walker
│   ├── view/             # timeline, tasks, search, stale, stats
│   └── render/           # HTML template engine (embedded templates)
├── Makefile
└── go.mod
CONTEXT.md                # product vision and principles
README.md                 # install + usage
```

## Two layers

- **Skill** (no code) — tells agents how to capture events as markdown files. Lives in agent's skill dir.
- **Tool** (Go binary) — reads vault, produces views. `brain timeline`, `brain tasks`, `brain search`, etc.

## Building the tool

```bash
cd tool && make build    # produces ./brain binary
make install             # installs to $GOPATH/bin
make cross               # cross-compile for all platforms
```

## What to work on

- **SKILL.md** — capture rules for agents. Changes here change how agents write events.
- **tool/** — Go CLI for views and computation. Add new views here.
- **Templates** — strict HTML templates in `tool/internal/render/templates/`.
- **CONTEXT.md** — update when principles change. Not for every small decision.

## Rules

1. **SKILL.md is the product.** Every change should make the agent better at capturing, querying, or presenting.
2. **Templates are strict.** They define layout. The agent fills slots. No "guidelines" — actual template files.
3. **Five event types only:** note, task, decision, fact, link. Don't add types without discussion.
4. **Four task statuses only:** open, done, blocked, cancelled.
5. **Keep the skill self-contained.** An agent should learn the full system from SKILL.md alone.
6. **Plain markdown everywhere.** Events, templates, the skill itself. No proprietary formats.
