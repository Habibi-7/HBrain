# Living Second Brain — Project Context

> Vision and principles. Not implementation details.

---

## What we're building

A **living second brain**: a personal knowledge, task, and thinking system backed by plain markdown files the user owns.

The product is a **skill** — a document that teaches a computer agent how to capture, query, and present the user's knowledge. No app. No CLI. No package to install. The computer agent already has file tools, bash, and natural language understanding. We teach it our opinions.

The agent is the mouth and ears. Our skill is the hippocampus.

## The key insight

Computer agents (Cowork, Manus, Claude Code, etc.) already have filesystem access and can write files. We don't need to build capture infrastructure. We don't need a CLI wrapper around `mkdir` and `write`. We need to teach the agent **our schema** — how to structure knowledge so it stays useful over time.

Our product is:
1. **An opinionated schema** — how events are structured (frontmatter, types, folder layout)
2. **Strict templates** — how views look (timeline, heatmap, task board)
3. **A skill document** — teaches any computer agent both of the above

That's it. Everything else is the agent's native capability.

## Who it's for

People with high cognitive load — students, researchers, founders, knowledge workers. "People who think for a living" and need persistence, retrieval, and review over long horizons.

Teams benefit from the strict template system: everyone sees identical views.

## The three-layer model

```
┌──────────────────────────────────────────────┐
│  Computer Agent (Cowork / Manus / Claude Code)│
│                                              │
│  • Reads our skill → learns schema + rules   │
│  • Captures: writes markdown event files     │
│  • Queries: reads files, filters, aggregates │
│  • Renders: fills our templates, presents    │
└──────────────┬───────────────────────────────┘
               │ reads/writes
               ▼
┌──────────────────────┐
│  Vault (markdown)    │
│                      │
│  events/YYYY/MM/DD/  │
│  .brain/templates/   │
└──────────────────────┘
```

**The skill teaches.** The agent does.

## Why this problem fits agent-native software

Three criteria from Hugentobler's "Feeding Computer Agents":

1. **Elapsed time, not inference time.** A second brain is maintained over months/years. Consistent practice over real time is the point.
2. **Learnings that don't generalize.** The user's ontology and priorities are personal.
3. **Apple-a-day effect.** Consistent daily capture creates value. Gaps kill it.

## Design principles

### The skill is the product

- No package to install. No binary. No server.
- The skill document teaches the agent everything: schema, capture rules, query patterns, view rendering.
- Works with any agent that can read files and run bash.
- Distribution = copying a folder.

### Strict templates

- Templates define how views look. The agent fills slots, doesn't improvise.
- Consistency across users, sessions, and team members.
- Templates are versioned. Same template = same visual output.

### Plain markdown

- Events are markdown files with YAML frontmatter.
- The folder is the source of truth. No database, no cache.
- Users edit in any editor. The agent picks up changes.
- Sync via Git, iCloud, Dropbox — whatever the user already uses.

## Event types

Five types. Use only these:

- `note` — freeform capture (default)
- `task` — something to do (status: open | done | blocked | cancelled)
- `decision` — "I chose X because Y"
- `fact` — external reference: quote, spec, number
- `link` — saved URL with optional commentary

## Views

Views are what make the brain worth having. Each view = a query pattern + a template:

| View | What it shows |
| --- | --- |
| Timeline | Chronological event stream |
| Heatmap | Activity density over time |
| Weekly review | Digest with highlights |
| Task board | Open / done / blocked grouped |
| Decision log | Chronological decisions |

Start with timeline. Add views as templates are created.

## What we own vs. what the agent owns

| Layer | Owner |
| --- | --- |
| Event schema + frontmatter format | Us (the skill) |
| Vault folder conventions | Us (the skill) |
| Templates | Us (strict files) |
| File writing (capture) | Agent (native capability) |
| File reading (query) | Agent (native capability) |
| Rendering (filling templates) | Agent |
| Presentation to user | Agent |

## Open questions

- Template format (current: HTML with `{{placeholders}}`; consider Markdown-only for simpler rendering)
- How to distribute templates (bundled with skill vs. separate repo vs. in-vault)
- Scale strategy when vault exceeds ~500 events (optional CLI/index layer?)
- Multi-agent consistency (what if different agents write slightly different frontmatter?)

## References

- Hugentobler, "Feeding Computer Agents." https://hugentobler.world/2026/feeding-computer-agents
- yan5xu, "CLI is All Agents Need." https://x.com/yan5xu/status/2031969426124521506
