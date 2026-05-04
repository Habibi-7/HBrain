# CLAUDE.md — instructions for agents working on this repo

This repo contains **Living Second Brain** — a skill that teaches computer agents to maintain a markdown-backed knowledge and task system.

## Repo structure

```
skill/
├── SKILL.md              # THE PRODUCT — the skill document
└── templates/
    └── timeline.html     # strict view template
CONTEXT.md                # product vision and principles
README.md                 # install + usage
```

There is no code to build or test. The product is the skill document and templates.

## What to work on

- **SKILL.md** — the skill that agents read. Capture rules, event schema, query patterns, view rendering instructions. Changes here change the product.
- **Templates** — strict HTML/MD templates for views. Add new ones in `skill/templates/`.
- **CONTEXT.md** — update when principles change. Not for every small decision.

## Rules

1. **SKILL.md is the product.** Every change should make the agent better at capturing, querying, or presenting.
2. **Templates are strict.** They define layout. The agent fills slots. No "guidelines" — actual template files.
3. **Five event types only:** note, task, decision, fact, link. Don't add types without discussion.
4. **Four task statuses only:** open, done, blocked, cancelled.
5. **Keep the skill self-contained.** An agent should learn the full system from SKILL.md alone.
6. **Plain markdown everywhere.** Events, templates, the skill itself. No proprietary formats.
