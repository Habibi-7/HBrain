# HBrain

HBrain is a skill for computer agents. It teaches Cursor, Claude Code/Cowork,
OpenAI Codex, Windsurf, and similar agents to notice durable thoughts in natural
conversation, save them as plain markdown files you own, and render useful HTML
views when you ask.

The core idea:

```text
Markdown memory + LLM judgment + HTML artifacts
```

No database is required. No server is required. The optional `brain` CLI is only
a helper for mechanical work like counts, task lists, and default timelines.

HBrain is open source. The npm package is only the installer transport; the
source, skill, templates, and installer code live in this public repository.

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

## Quick Start For Non-Technical Users

Paste this into your agent:

```text
Install HBrain for me with:
npx hbrain install
```

The agent will ask where to keep your vault, install the right skill/rule for
your platform, create the vault folders, copy default templates, and verify the
setup.

Default vault:

```text
~/brain
```

## Install Yourself

The npm installer auto-detects supported agent platforms and installs the
skill in the right place:

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

| Platform | Install path |
| --- | --- |
| Claude Code / Cowork | `~/.claude/skills/brain.md` |
| Cursor | `.cursor/rules/brain.mdc` |
| OpenAI Codex | `AGENTS.md` managed block |
| Windsurf | `.windsurf/rules/brain.md` |
| Any agent | Load or paste `skill/SKILL.md` |

Platform wrappers are generated from `skill/SKILL.md`, so the skill has one
source of truth.

Source install is still available for contributors:

```bash
git clone https://github.com/Habibi-7/living-brain.git
cd living-brain
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

- `skill/SKILL.md`: canonical product skill.
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
