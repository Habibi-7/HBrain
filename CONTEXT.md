# Living Second Brain — Project Context

> This file is meant to be fed as context to coding agents (Claude Code, etc.) working on this repo. It captures the product vision, the guiding principles, and the reading that shaped the design — not implementation details. Keep it principle-level; let architecture decisions live closer to the code.

---

## What we're building

A **living second brain**: a personal knowledge, task, and thinking system that actively maintains itself. Unlike a passive note vault (Notion, plain Obsidian, Apple Notes), this system:

- Captures input continuously from many channels (text, voice, forwarded email, screenshots, quick-bar entries).
- Classifies, links, and organizes captures automatically.
- Surfaces derived views on demand — timelines, weekly reviews, project briefs, "what did I decide about X" — not just raw text.
- Tracks tasks, reminders, and progress alongside knowledge. The brain and the to-do list are one thing.
- Keeps old material useful over time instead of letting it rot.

Storage is plain markdown in a folder the user owns. The user can edit manually in any editor; the system picks up changes.

The product is **agent-native**: the primary interface is the user's computer agent (Cowork / Manus / equivalent), not a traditional web app or mobile app. The agent is the mouth and ears. Our product is the hippocampus.

## Who it's for

People with high cognitive load and a continuous stream of thoughts, decisions, tasks, and reference material — students, researchers, professors, founders, knowledge workers. The unifying trait is "people who think for a living" and who need persistence, retrieval, and review over long horizons.

## Why this problem fits agent-native software

Three criteria from Hugentobler's "Feeding Computer Agents" essay, applied here:

1. **Elapsed time, not inference time.** A second brain is maintained over months and years. More compute can't one-shot it; consistent application of practices over real time is the point.
2. **Learnings that don't generalize.** The user's ontology, priorities, and scar tissue are personal. Frontier models can't substitute for them.
3. **Apple-a-day effect.** Consistent daily capture and review is what creates value. Gaps kill it. This rewards a system designed around habit and repetition.

## Design principles

### Agent-native architecture (from Hugentobler)

- The product runs inside a **harness** (the agent's sandbox): subagents, tools, MCP servers.
- **Hooks** enforce permissions, validation, and feedback on every write.
- **Filesystem** is the interface: instructions, read-only data (templates, references), writeable artifacts.
- **Auditable artifacts**: every change is traceable — who/what made it, when, and why.
- **Predictable performance**: small, well-understood toolkit; bounded subagents; explicit cost signals.
- **CLI as the onboarding surface**: the agent learns the product by using it, not by reading a manual.

### CLI design (from yan5xu's "CLI is All Agents Need")

- A single top-level CLI (working name: `brain`) exposes all capabilities as Unix-style subcommands. No sprawling catalog of typed tool schemas.
- LLMs already speak CLI fluently from training data; leverage that instead of inventing a new interface.
- **Progressive disclosure via `--help`**: one-line command list → per-command usage on bare invocation → per-subcommand parameters when drilled in. Agent pulls only the docs it needs.
- **Errors double as navigation**: every error message says what broke *and* what to do instead.
- **Consistent output footer**: exit code, duration, cost — so the agent learns success/failure and cost awareness over repeated use.
- **Two-layer architecture**: a pure Unix execution layer (clean pipes, exit codes) underneath a presentation layer for LLM consumption (binary guards, truncation with overflow pointers, metadata footer).

## Storage model

- **Plain markdown files** in a user-owned folder. No proprietary format.
- **YAML frontmatter** carries typed metadata (event type, timestamp, source, links, tags).
- The folder is the **source of truth**. Any index, cache, or vector store is derivative and rebuildable from the markdown.
- Users edit manually in whatever editor they prefer; the system is responsible for noticing changes and adapting (exact mechanism TBD — open design question).
- Sync, backup, and cross-device access are composed from tools the user already uses (iCloud, Git, Dropbox, Obsidian Sync, etc.). We do not build our own sync. Which to recommend/support first is an open question.

## Interaction surfaces

**Primary (MVP):**
- The user's computer agent calls our CLI to capture, query, and maintain.
- The user edits markdown files directly in any editor.

**Supporting (later):**
- Quick-capture channels (forwarding email, share sheet, keyboard shortcut / bar).
- Obsidian plugin for browsing, graph view, command-palette access to subagents.
- Rendered artifacts (HTML timelines, project briefs, weekly reviews) generated on demand from events.
- Cloud tier (mirror, not source of truth) for mobile capture, scheduled tasks, external API, sharing.

## Memory and retrieval

- **We own the memory layer.** The event store, schema, retrieval logic, and maintenance loops are the product. This is the moat; it cannot be outsourced.
- External memory tools (mem0, vector DBs, etc.) may be composed underneath for one layer — fuzzy semantic recall — but they don't define the schema or the write path.
- Do **not** rely on the user's computer agent memory for anything the product promises to remember. Agent memory is ephemeral and model-scoped.
- Preferred primitive: **events**, not "notes." Time-stamped, typed, with a source and payload. Derived views (timeline, project page, weekly review) are queries over the event stream. This makes the system auditable and replayable.

## Subagents

Scoped worker agents spawned by the main harness with their own context and small toolsets. Each returns a structured artifact. Budgeted and evaluated independently. Candidates for this product:

- **Capture** — classify, tag, extract entities, link on every new input.
- **Retrieval** — multi-pass query for "where did I put…" / "what did I decide about…" questions.
- **Review** — scheduled digests (daily, weekly, per-project).
- **Render** — produce rendered artifacts (timeline, brief, digest) from query results using templates.
- **Watchdog** — surface contradictions, stalled tasks, overdue commitments.

## First things to build

Two before anything else; everything else is accretion on top:

1. **The capture path + event schema.** The heartbeat. If adds are friction-y or lossy, nothing downstream matters.
2. **One killer rendered retrieval surface** (timeline is a leading candidate). Proves the brain pays interest on what was captured.

Defer: reminder engine, contradiction detection, Obsidian plugin, cloud tier, multi-agent councils. All valuable, none MVP.

## Open questions (not yet settled)

- Exact mechanism for detecting manual file edits (lazy on query vs. watcher vs. hybrid).
- Default sync strategy and whether Git is a first-class option from day one.
- Whether to ship an Obsidian plugin early (distribution) or late (quality bar).
- Whether to bundle a vector store or rely on structured queries + filesystem search initially.
- Precise frontmatter schema and type taxonomy for events.
- Cloud tier shape and when it enters the roadmap.

## References

- Hugentobler, "Feeding Computer Agents." https://hugentobler.world/2026/feeding-computer-agents
- yan5xu, "CLI is All Agents Need — A *nix Agent Design Guide." https://x.com/yan5xu/status/2031969426124521506
- Related reading worth pulling in as the project evolves: Karpathy on long-term memory for LLMs; Linear's product philosophy on opinionated defaults and keyboard-first workflows; Obsidian's file-over-app philosophy.

## How to use this file

When starting a new coding session with an agent, paste or attach this file as context. It is principle-level on purpose — keep architecture decisions and implementation details in the code and in per-module docs, not here. Update this file when a principle genuinely changes; do not churn it for every design decision.
