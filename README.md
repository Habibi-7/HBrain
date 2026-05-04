# brain — Living Second Brain

A skill that teaches your computer agent to maintain a personal knowledge and task system as plain markdown files.

No app. No CLI. No package. Your agent already knows how to write files — this skill teaches it **what** to write and **how** to present it.

## How it works

```
You speak naturally → Agent writes structured markdown → Agent queries + renders views
```

The skill teaches your agent:
- **Schema** — how to structure events (5 types: note, task, decision, fact, link)
- **Capture** — when and how to write event files
- **Query** — how to find, filter, and aggregate events
- **Views** — how to render data using strict templates

## Install

### Claude Code / Cowork

Copy the skill folder:

```bash
cp -r skill/SKILL.md ~/.claude/skills/brain/SKILL.md
```

Copy templates to your vault (after creating one):

```bash
mkdir -p ~/brain/.brain/templates
cp skill/templates/* ~/brain/.brain/templates/
```

### Other agents

Install the skill however your agent platform supports it. The skill is a
self-contained markdown document — any agent that can read it will learn the
system.

## After install

Talk naturally:

- "Remember that I chose Postgres for the JSON support"
- "I need to review the proposal by Friday"
- "What did I decide about the database?"
- "Show my week"
- "List my open tasks"
- "Mark that task done"

The agent captures events as markdown files and queries them to answer your questions.

## What gets created

```
~/brain/
├── events/
│   └── 2026/05/04/
│       └── 01JVMY7QX-chose-postgres.md
├── renders/
└── .brain/
    └── templates/
        └── timeline.html
```

Each event is a markdown file:

```markdown
---
id: 01JVMY7QXR8KF3DNQJ5CGPXG9S
schema: 1
type: decision
created_at: 2026-05-04T14:32:11Z
source: agent
agent: cowork
tags: [backend, database]
links: []
---

Chose Postgres over Mongo because of native JSON support and ACID guarantees.
```

## Event types

| Type | Use |
| --- | --- |
| `note` | Freeform thought, observation, idea (default) |
| `task` | Something to do (status: open / done / blocked / cancelled) |
| `decision` | "I chose X because Y" |
| `fact` | External reference: quote, spec, number |
| `link` | Saved URL with optional commentary |

## Templates

Templates in `.brain/templates/` define strict, consistent views. The agent
fills template slots with event data — it doesn't improvise layout.

Teams using the same templates see identical views.

## Vision

See [CONTEXT.md](./CONTEXT.md) for the full product vision and design principles.
