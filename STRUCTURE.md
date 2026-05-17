# Repository Structure

HBrain is currently an agent-facing skill/prompt system with an
optional deterministic CLI for local vault helpers. This file maps the current
workspace and should be updated when folders or major files change.

## Current LLM Usage

The repo does not call an LLM API directly from the Go CLI or shell scripts.
The LLM is the host agent: Cursor, Claude Code, Cowork, OpenAI Codex, Windsurf,
or another agent reads `skill/SKILL.md` and uses its own reasoning plus file
tools to capture, query, and render the brain.

Deterministic code stays at the edges: install/uninstall, validation, parsing,
counts, and default views. LLM judgment stays in the skill: semantic capture,
synthesis, and on-the-fly HTML artifacts.

## Annotated Tree

```text
.
├── .claude/                                      # Local Claude agent artifacts; not product source.
│   └── worktrees/                               # Claude-created temporary worktree directories from prior runs.
│       ├── admiring-dijkstra-325069/            # Empty/local agent worktree artifact.
│       ├── eloquent-ardinghelli-d6d1a8/         # Empty/local agent worktree artifact.
│       ├── funny-jones-4594c9/                  # Empty/local agent worktree artifact.
│       ├── infallible-lederberg-960c8b/         # Empty/local agent worktree artifact.
│       ├── nifty-jackson-d4e54a/                # Empty/local agent worktree artifact.
│       ├── sweet-wiles-4a0ab8/                  # Empty/local agent worktree artifact.
│       └── zealous-lovelace-9ea88c/             # Empty/local agent worktree artifact.
├── platforms/                                   # Notes on generated platform adapters.
│   └── README.md                                # Explains generated install paths and the canonical `skill/SKILL.md` source.
├── skill/                                       # Canonical product skill and templates.
│   ├── SKILL.md                                 # Main HBrain skill: schema, capture, query, rendering, output style.
│   └── templates/                               # Templates copied into user vaults.
│       └── timeline.html                        # Portable strict timeline template for agent-filled rendered views.
├── tool/                                        # Optional Go CLI for deterministic local helpers.
│   ├── .gitignore                              # Ignores local `brain` binary and `dist/` cross-compile output.
│   ├── Makefile                                # Build, install, test, clean, and cross-compile commands.
│   ├── go.mod                                  # Go module declaration for `github.com/Habibi-7/living-brain/tool`.
│   ├── cmd/                                    # CLI command entrypoint packages.
│   │   └── brain/                              # Main `brain` binary package.
│   │       └── main.go                         # Routes CLI commands, discovers vaults, and opens timeline HTML.
│   └── internal/                               # Private Go packages used by the CLI.
│       ├── event/                              # Event schema, parsing, and sorting.
│       │   └── event.go                        # Defines event types/statuses and parses markdown frontmatter/body.
│       ├── render/                             # HTML rendering layer for views.
│       │   ├── render.go                       # Embeds templates, groups events by day, and renders timelines.
│       │   └── templates/                      # Go `html/template` files embedded into the binary.
│       │       └── timeline.html               # Dark monospace CLI timeline HTML template.
│       ├── skill/                              # Custom skill parsing and scaffolding.
│       │   ├── skill.go                        # Parses custom `SKILL.md` frontmatter, triggers, and body.
│       │   ├── skill_test.go                   # Tests skill parsing, store creation, listing, duplicates, and name cleanup.
│       │   ├── store.go                        # Finds/creates `~/brain/skills/*` and isolated custom skill vaults.
│       │   └── template.go                     # Generates scaffolded custom `SKILL.md` content.
│       ├── vault/                              # Vault discovery and event walking.
│       │   └── vault.go                        # Finds `$BRAIN_DIR` or `~/brain`, validates `events/`, and parses events.
│       └── view/                               # Terminal/HTML view implementations.
│           ├── search.go                       # Simple case-insensitive body/tag search.
│           ├── stale.go                        # Lists open/blocked tasks older than a chosen age.
│           ├── stats.go                        # Summarizes counts by type, task status, date range, and top tags.
│           ├── tasks.go                        # Lists task events, optionally filtered by status.
│           └── timeline.go                     # Filters recent events and passes them to the renderer.
├── .env.example                                # Example env vars for local vault path.
├── bin/                                        # npm/npx command entrypoint.
│   └── hbrain.js                               # Zero-dependency installer exposed as `hbrain`.
├── .gitignore                                  # Ignores env files, OS/editor noise, and local demo/test vaults.
├── CLAUDE.md                                   # Repo-specific instructions for coding agents working here.
├── CONTEXT.md                                  # Product vision: skill-first, markdown memory, HTML artifacts.
├── INSTALL_FOR_AGENTS.md                       # Agent-readable setup flow for non-technical users.
├── LICENSE                                     # MIT license.
├── README.md                                   # User-facing install, uninstall, first-use, CLI, and platform docs.
├── STRUCTURE.md                                # This living annotated repo map.
├── UNINSTALL_FOR_AGENTS.md                     # Agent-readable removal flow with vault deletion safety rules.
├── install.sh                                  # Installer for platform instructions plus Go CLI.
└── uninstall.sh                                # Uninstaller for platform instructions and Go CLI, with optional vault purge.
```

## Cleanup Notes

- `.claude/worktrees/*/` appears to contain local agent worktree directories. These are workspace artifacts and should not be committed unless there is a deliberate reason.
