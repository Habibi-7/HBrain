# HBrain

**Agent-native second brain.** A Claude Code plugin (also installable as a
plain skill for Cursor, Codex, Windsurf, etc.) that teaches your computer
agent to notice durable thoughts in natural conversation, save them as plain
markdown files you own, and render Linear-style HTML views when you ask.

```text
Markdown memory + LLM judgment + HTML artifacts
```

No database. No server. No proprietary format. Your vault is a folder of
markdown files you can edit in any text editor — HBrain just gives the
agent the rules and tools to maintain it for you.

The optional `brain` CLI does mechanical work (counts, task boards, timeline
renders). The agent reaches for it when it pays off and falls back to direct
file reads when not.

## What It Feels Like

After setup, talk normally:

```text
"I think Tailwind is the right call because we're moving faster"
  -> captures a decision

"I need to review the auth PR before Friday"
  -> captures an open task

"What did I decide about the database?"
  -> answers from your markdown vault

"Show my week"
  -> creates an HTML timeline artifact

"Show my project progress as a graph"
  -> creates an HTML visual artifact
```

The agent should not need magic phrases like "remember this." Those are only
examples. The skill teaches semantic judgment: capture plans, decisions, tasks,
preferences, facts, links, project updates, and recurring thoughts when they are
likely to matter later.

## Quick Start

Different surfaces, different install. Pick yours.

### Cowork (web, on claude.ai)

Paste into chat:

```text
Run `npx hbrain install`.
```

The installer drops the skill at `~/.claude/skills/hbrain/`, creates
`~/brain/` as the vault if missing, copies templates, runs the sandbox
check, and prints `HBrain is ready`. If your Cowork session has your
local machine connected, `~` is your real home and the vault persists
across sessions.

Edge cases (no local-machine connector, no npm in sandbox):
[INSTALL_COWORK.md](./INSTALL_COWORK.md).

A one-click Cowork plugin is coming via Anthropic's community marketplace
([HH-618](https://linear.app/hhabibi/issue/HH-618)).

### Claude Code CLI (terminal)

One-shot install from the self-hosted marketplace:

```text
/plugin marketplace add Habibi-7/hbrain
/plugin install hbrain
```

That gets you:

- A SessionStart hook that auto-detects your vault and agent identity every
  turn (no more "agent forgot to run `brain doctor`")
- Slash commands: `/hbrain:timeline`, `/hbrain:tasks`, `/hbrain:capture`,
  `/hbrain:doctor`, `/hbrain:setup`
- The bundled `brain` CLI on `PATH` (no separate Go install)
- The full HBrain skill (capture rules, design system, query recipes)

Default vault: `~/brain`. Override with `BRAIN_DIR=/path/to/vault`.

### Other agents (Cursor, Codex, Windsurf)

For non–Claude-Code agents, the npm installer drops the skill into the right
place for your platform:

```bash
npx hbrain install
```

Install for a specific platform:

```bash
npx hbrain install --cursor
npx hbrain install --claude
npx hbrain install --codex
npx hbrain install --windsurf
```

Use a custom vault path:

```bash
npx hbrain install --cursor --vault ~/Dropbox/brain
```

Skip vault folder/template setup:

```bash
npx hbrain install --cursor --no-vault
```

Platform install paths:

| Platform | Install method | Notes |
| --- | --- | --- |
| Claude Code CLI | `/plugin install hbrain` | Full plugin: hook + slash commands + bundled binary |
| Cowork (web) | Two-step paste — see [INSTALL_COWORK.md](./INSTALL_COWORK.md) | Skill-only (no hook/binary in sandbox) until the `.plugin` lands |
| Cursor | `npx hbrain install --cursor` | `.cursor/rules/brain.mdc` |
| OpenAI Codex | `npx hbrain install --codex` | `AGENTS.md` managed block |
| Windsurf | `npx hbrain install --windsurf` | `.windsurf/rules/brain.md` |
| Any agent | manual | Load or paste `skills/hbrain/SKILL.md` |

Platform wrappers are generated from `skills/hbrain/SKILL.md`, so the skill has one
source of truth.

Source install is still available for contributors:

```bash
git clone https://github.com/Habibi-7/hbrain.git
cd hbrain
sh install.sh --cursor --no-cli
```

## How It Works

```text
You speak naturally
  -> Agent decides whether the thought has future value
  -> Agent writes one markdown event file into your vault
  -> Agent answers simple questions directly from the vault
  -> Agent creates HTML artifacts for visual views
```

The canonical skill teaches:

- **Schema**: five event types, four task statuses, and frontmatter rules.
- **Semantic capture**: use judgment instead of exact trigger phrases.
- **Retrieval**: read, filter, and aggregate plain markdown files.
- **HTML artifacts**: generate self-contained visual views for timelines,
  dashboards, heatmaps, graphs, boards, and reviews.
- **Optional helpers**: use deterministic scripts/CLI when they are present,
  but never depend on them for core behavior.

## Vault Structure

Your brain is a normal folder:

```text
~/brain/
├── events/
│   └── YYYY/MM/DD/
│       └── <ulid>-<slug>.md
├── renders/
├── skills/
│   └── <custom-skill>/
│       ├── SKILL.md
│       └── vault/events/
└── .brain/
    └── templates/
        └── timeline.html
```

Each event is plain markdown:

```markdown
---
id: 01JVMY7QXR8KF3DNQJ5CGPXG9S
schema: 1
type: decision
created_at: 2026-05-04T14:32:11Z
source: agent
agent: cursor
tags: [backend, database]
links: []
---

Chose Postgres over Mongo because of native JSON support and ACID guarantees.
```

Supported event types:

| Type | Use when |
| --- | --- |
| `note` | Freeform thought, observation, idea. |
| `task` | Something to do. |
| `decision` | A choice plus the reasoning. |
| `fact` | External reference, quote, spec, number, attribution. |
| `link` | URL plus optional commentary. |

Task statuses:

```text
open | done | blocked | cancelled
```

## HTML Artifacts

Markdown is the source of truth. HTML is the view layer.

Agents should use plain text for simple lookup questions:

```text
"Did I decide to use Postgres?"
"How many open tasks do I have?"
"What was that link?"
```

Agents should generate self-contained HTML for visual requests:

```text
"Show my week"
"Make a heatmap of my work on this project"
"Show my open tasks as a board"
"Graph my progress on marathon training"
```

Artifact rules:

- Inline CSS and SVG when needed.
- No external network dependencies.
- Include date range, filters, event count, and generation time.
- Do not invent events, counts, dates, or links.
- Do not mutate the vault from generated HTML.
- Save to `~/brain/renders/` only when the user asks to save or share.

Default HBrain visual style:

- Every artifact title starts with `HBrain ·`.
- Use only black, white, gray, and red.
- No rounded corners, shadows, gradients, glassmorphism, or decorative emoji.
- Use semantic HTML and strong grid alignment.
- Do not claim interactivity unless the HTML actually implements it.
- Show provenance in the header: date range, filters, event count, generated time.

## Optional `brain` CLI

The CLI is not the product. It is a small deterministic helper the agent may use
when installed.

```bash
brain stats          # counts, types, top tags
brain tasks          # open tasks
brain tasks all      # every task by status
brain search postgres
brain stale 14       # open/blocked tasks older than 14 days
brain timeline       # default HTML timeline
brain timeline 30    # last 30 days
```

If the CLI is missing, the agent should read and write the markdown vault
directly.

## Custom Skills

You can create a separate workflow for meetings, research, bug logs, reading
notes, project journals, or anything else:

```bash
brain skill create "Meeting Notes" "Track meetings and action items"
brain skill create "Research Tracker" "Papers, citations, and reading notes"
brain skill list
brain skill show meeting-notes
```

A custom skill gets its own `SKILL.md` and isolated event vault. Customize:

- Event types.
- Discovery hints.
- Capture judgment.
- Output style.
- Domain-specific view rules.

## Uninstall

Remove the skill/rules and optional CLI, keeping your saved notes vault:

```bash
npx hbrain uninstall
```

Target one platform:

```bash
npx hbrain uninstall --codex
```

The uninstaller keeps your vault. Delete `~/brain` manually only if you want all
saved notes gone.

For agent-led uninstall, say:

```text
Uninstall HBrain with:
npx hbrain uninstall
```

## Repository Map

See [`STRUCTURE.md`](./STRUCTURE.md) for the current file/folder map.

Important files:

- `skills/hbrain/SKILL.md`: canonical product skill.
- `bin/hbrain.js`: zero-dependency npm/npx installer command.
- `package.json`: npm package metadata for `hbrain`.
- `install.sh`: source checkout installer.
- `uninstall.sh`: source checkout uninstaller.
- `tool/`: optional Go helper CLI.
- `docs/`: Mintlify documentation.
- `platforms/`: notes on generated platform wrappers.
- `CONTEXT.md`: product principles.

## License

MIT
