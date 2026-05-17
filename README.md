# Living Second Brain

Living Second Brain is a skill for computer agents. It teaches Cursor, Claude
Code/Cowork, OpenAI Codex, Windsurf, and similar agents to notice durable
thoughts in natural conversation, save them as plain markdown files you own, and
render useful HTML views when you ask.

The core idea:

```text
Markdown memory + LLM judgment + HTML artifacts
```

No database is required. No server is required. The optional `brain` CLI is only
a helper for mechanical work like counts, task lists, and default timelines.

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
Open and follow this GitHub file:
https://github.com/Habibi-7/living-brain/blob/main/INSTALL_FOR_AGENTS.md
```

The agent will ask where to keep your vault, install the right skill/rule for
your platform, optionally install the helper CLI, and verify the setup.

Use the GitHub `blob` URL for agents because some agent sandboxes can access
`github.com` but block `raw.githubusercontent.com`. If the installer cannot
fetch the raw files, the agent should stop and report that network restriction
instead of cloning or doing a partial manual install.

Default vault:

```text
~/brain
```

## Install Yourself

The public installer auto-detects supported agent platforms and installs the
skill in the right place:

```bash
curl -fsSL https://raw.githubusercontent.com/Habibi-7/living-brain/main/install.sh | sh
```

Install for a specific platform:

```bash
curl -fsSL https://raw.githubusercontent.com/Habibi-7/living-brain/main/install.sh | sh -s -- --cursor
curl -fsSL https://raw.githubusercontent.com/Habibi-7/living-brain/main/install.sh | sh -s -- --claude
curl -fsSL https://raw.githubusercontent.com/Habibi-7/living-brain/main/install.sh | sh -s -- --codex
curl -fsSL https://raw.githubusercontent.com/Habibi-7/living-brain/main/install.sh | sh -s -- --windsurf
```

Install only the agent skill/rule and skip the optional CLI:

```bash
curl -fsSL https://raw.githubusercontent.com/Habibi-7/living-brain/main/install.sh | sh -s -- --cursor --no-cli
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
curl -fsSL https://raw.githubusercontent.com/Habibi-7/living-brain/main/uninstall.sh | sh
```

Also delete the vault (`$BRAIN_DIR` or `~/brain`) only if you want all saved
brain data gone:

```bash
curl -fsSL https://raw.githubusercontent.com/Habibi-7/living-brain/main/uninstall.sh | sh -s -- --purge-vault --yes
```

For agent-led uninstall, paste:

```text
Open and follow this GitHub file:
https://github.com/Habibi-7/living-brain/blob/main/UNINSTALL_FOR_AGENTS.md
```

## Repository Map

See [`STRUCTURE.md`](./STRUCTURE.md) for the current file/folder map.

Important files:

- `skill/SKILL.md`: canonical product skill.
- `install.sh`: public installer.
- `uninstall.sh`: public uninstaller.
- `tool/`: optional Go helper CLI.
- `docs/`: Mintlify documentation.
- `platforms/`: notes on generated platform wrappers.
- `CONTEXT.md`: product principles.

## License

MIT
