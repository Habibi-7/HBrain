# brain — Living Second Brain

A skill that teaches your agent to notice durable thoughts, tasks, decisions,
facts, and links in natural conversation, save them as plain markdown files you
own, and render useful views when you ask.

## Install

**For agents setting this up for a non-technical user:** read
[`INSTALL_FOR_AGENTS.md`](./INSTALL_FOR_AGENTS.md). It walks the agent through
installing the skill, optionally installing the CLI helper, choosing or creating
the vault, and verifying everything works.

Paste this into your agent:

```text
Retrieve and follow the instructions at:
https://raw.githubusercontent.com/Habibi-7/living-brain/main/INSTALL_FOR_AGENTS.md
```

One line. Auto-detects your agent platform, installs the skill, and installs the
optional `brain` helper CLI when Go is available.

**Private repo (gh already authed):**
```bash
gh api -H "Accept: application/vnd.github.v3.raw" /repos/Habibi-7/living-brain/contents/install.sh | sh
```

**Public repo:**
```bash
curl -fsSL https://raw.githubusercontent.com/Habibi-7/living-brain/main/install.sh | sh
```

The installer detects `~/.claude`, `.cursor/`, `.windsurf/`, `.github/` and puts
the skill in the right place. Platform wrappers are generated from
`skill/SKILL.md`, so the prompt logic has one source of truth.

**Force a specific platform:**
```bash
... | sh -s -- --cursor    # Cursor
... | sh -s -- --claude    # Claude Code / Cowork
... | sh -s -- --windsurf  # Windsurf
... | sh -s -- --copilot   # GitHub Copilot
... | sh -s -- --cursor --no-cli  # skill/rule only, skip optional CLI
```

## Uninstall

**For agents removing this for a non-technical user:** read
[`UNINSTALL_FOR_AGENTS.md`](./UNINSTALL_FOR_AGENTS.md).

Paste this into your agent:

```text
Retrieve and follow the instructions at:
https://raw.githubusercontent.com/Habibi-7/living-brain/main/UNINSTALL_FOR_AGENTS.md
```

Remove the skill/rules and `brain` CLI, keeping your saved notes vault:

```bash
curl -fsSL https://raw.githubusercontent.com/Habibi-7/living-brain/main/uninstall.sh | sh
```

Also delete the vault (`$BRAIN_DIR` or `~/brain`) only if you want all saved
brain data gone:

```bash
curl -fsSL https://raw.githubusercontent.com/Habibi-7/living-brain/main/uninstall.sh | sh -s -- --purge-vault --yes
```

## First use

After install, just talk to your agent. First time it will ask where to keep your vault (default: `~/brain`). Then:

```
"I think Tailwind is the right call because we're moving faster"  →  ✓ decision saved
"I need to review the auth PR before Friday"                      →  ✓ task · open
"what did I decide about the database?"                           →  decision · May 4 · Chose Postgres...
"show my week"                                                    →  HTML timeline artifact
"show my project progress as a graph"                             →  HTML visual artifact
```

## brain CLI

The CLI is optional helper code for deterministic mechanical work. Agents can
use it when present, or read the markdown vault directly when it is not.

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

## Custom skills

Don't want a second brain? Build your own workflow. Each skill is a directory
with a `SKILL.md` that defines its own event types, discovery hints, and capture
judgment.

```bash
brain skill create "Meeting Notes" "Track meetings and action items"
brain skill create "Research Tracker" "Papers, citations, and reading notes"
brain skill list
brain skill show meeting-notes
```

Skills live at `~/brain/skills/`. Each one gets:
- A `SKILL.md` — load this into your agent to activate the skill
- A `vault/events/` directory — isolated event storage for that skill

After creating, open the `SKILL.md` and customize:
- **Event types** — replace the defaults with types that fit your domain
- **Discovery hints** — phrases that help an agent find the skill
- **Capture judgment** — domain-specific instructions for what is worth saving

```bash
# See where the skill file is, then open it in your editor
brain skill path meeting-notes
```

Load the skill into your agent the same way you load the default brain skill — just point to that SKILL.md instead.

## How it works

```
You speak naturally
  → Agent uses judgment to capture durable signals as markdown
  → Agent answers simple questions directly from the vault
  → Agent renders HTML artifacts for visual timelines, dashboards, heatmaps, and graphs
```

The default skill teaches your agent:
- **Schema** — 5 event types: `note` `task` `decision` `fact` `link`
- **Capture** — use semantic judgment, one durable thought per file, preserve your phrasing
- **Query** — find, filter, aggregate using file tools
- **Views** — generate self-contained HTML artifacts, using templates as defaults
- **Helpers** — optionally use `brain` CLI for stable parsing, counts, validation, and default views

Or create a custom skill for any domain — meeting notes, research tracking, project logs, anything.

## Vault structure

```
~/brain/
├── events/
│   └── YYYY/MM/DD/
│       └── <ulid>-<slug>.md    # one file per thought
├── renders/
├── skills/
│   ├── meeting-notes/
│   │   ├── SKILL.md            # custom skill definition
│   │   └── vault/events/       # isolated event storage
│   └── research-tracker/
│       ├── SKILL.md
│       └── vault/events/
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
| Any agent | `skill/SKILL.md` → paste or load into system prompt |

See [`platforms/`](./platforms/) for how platform wrappers are generated from
the canonical skill.

## Vision

See [CONTEXT.md](./CONTEXT.md).
