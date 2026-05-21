# CLAUDE.md — instructions for agents working on this repo

This repo contains **HBrain** — a Claude Code plugin + CLI tool that captures and retrieves a markdown-backed knowledge and task system.

## Repo structure

```
.claude-plugin/
├── plugin.json           # plugin manifest (name, version, author)
└── marketplace.json      # self-hosted marketplace catalog
skills/
└── hbrain/
    ├── SKILL.md          # THE SKILL — capture + render rules for agents
    ├── design.md         # design system for custom artifacts
    ├── vault-setup.md    # sandbox detection + mount flow
    ├── queries.md        # direct-vault query recipes
    ├── cli.md            # brain CLI command reference
    └── templates/        # canonical Go html/template views
        ├── timeline.html
        └── tasks.html
commands/                 # slash commands as TOML
├── timeline.toml         # /hbrain:timeline
├── tasks.toml            # /hbrain:tasks
├── capture.toml          # /hbrain:capture <text>
├── doctor.toml           # /hbrain:doctor
└── setup.toml            # /hbrain:setup
hooks/                    # SessionStart hook → injects vault + identity context
├── hooks.json
└── hbrain-activate.sh
bin/                      # bundled brain binary (host platform)
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

## Three layers

- **Plugin shell** (`.claude-plugin/`, `commands/`, `hooks/`, `bin/`) — packages the skill + CLI for one-shot install via `/plugin install hbrain`. SessionStart hook makes the agent reliable (deterministic identity + vault detection every turn).
- **Skill** (`skills/hbrain/`) — tells agents how to capture events and render views. Read by Claude Code when the plugin is loaded.
- **Tool** (`tool/`, Go binary) — reads vault, produces views. `brain timeline`, `brain tasks`, `brain search`, etc.

## Building the tool

```bash
cd tool && make build    # produces ./brain binary
make install             # installs to $GOPATH/bin
make cross               # cross-compile for all platforms
```

## What to work on

- **skills/hbrain/SKILL.md** — capture + render rules for agents. Changes here change how agents write events and render views.
- **skills/hbrain/design.md** — design system for custom (non-template) HTML artifacts.
- **commands/*.toml** — slash command surface (`/hbrain:timeline`, etc.).
- **hooks/hbrain-activate.sh** — what the SessionStart hook injects.
- **tool/** — Go CLI for views and computation. Add new views here.
- **skills/hbrain/templates/** — strict HTML templates. The Makefile copies these into `tool/internal/render/templates/` at build time via `make prep`.
- **CONTEXT.md** — update when principles change. Not for every small decision.

## Rules

1. **SKILL.md is the product.** Every change should make the agent better at capturing, querying, or presenting.
2. **Templates are strict.** They define layout. The agent fills slots. No "guidelines" — actual template files.
3. **Five event types only:** note, task, decision, fact, link. Don't add types without discussion.
4. **Four task statuses only:** open, done, blocked, cancelled.
5. **Keep the skill self-contained.** An agent should learn the full system from SKILL.md alone.
6. **Plain markdown everywhere.** Events, templates, the skill itself. No proprietary formats.
