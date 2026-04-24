# CLAUDE.md — instructions for the computer agent

You are working inside **LSB (Living Second Brain)**. The user has a CLI called `brain` that maintains their personal knowledge + task system as a folder of markdown files. This file tells you when to use it and how.

Deeper context, only if you need it: [`CONTEXT.md`](./CONTEXT.md) (vision), [`ARCHITECTURE.md`](./ARCHITECTURE.md) (codebase), [`README.md`](./README.md) (usage).

---

## When to use `brain`

**Capture** (call `brain add`) whenever the user:

- states a fact, decision, observation, or thought worth remembering ("I decided to use ULID…", "turns out X beats Y because…")
- mentions reading, watching, meeting, learning something
- says "remember that…", "note that…", "save this…", "bookmark…"
- gives themselves a task ("I should…", "remind me to…", "TODO…")
- sends you a URL, quote, or snippet they want to keep

**Retrieve** (call `brain timeline` or `brain show`) whenever the user:

- asks "what did I…", "when did I…", "what did I decide about…"
- wants a recap of a day / week / project
- references an event by vague memory ("that thing I captured last week")

If in doubt, **capture silently and continue**. Lost signal is worse than a stray event. The user can delete one file. They cannot recover a thought you didn't write down.

## How to learn the tool

The CLI is self-documenting. Don't guess flags.

1. Run `brain` with no arguments to see the command tree.
2. Every response has a `next_actions` field with concrete command templates — use them verbatim, filling in `params.value` where provided.
3. Every error has a `fix` field — act on it, don't guess.

Example:

```bash
brain add "..." --type <type>   # next_actions will include `brain show <id>` with params.value prefilled
```

## Contract you can rely on

Every command returns JSON (you're auto-detected as an agent):

```
success: { ok: true,  command, result, next_actions[], metrics }
error:   { ok: false, command, error{code,message,retryable}, fix, next_actions[], metrics }
```

Exit codes: `0` success · `2` user error · `3` retryable · `4` no vault · `1` unexpected.

`next_actions[i].params` may carry `value` (pre-filled), `default`, `enum` (pick one), `description`. Use `enum` to avoid inventing values.

## Event types

Five types exist. Use only these:

- `note` — freeform capture (default)
- `task` — something to do; has `status: open | done | blocked | cancelled`
- `decision` — "I chose X because Y"
- `fact` — external reference: quote, spec, number, source
- `link` — saved URL with optional commentary

When unsure, use `note`.

## Default calling patterns

```bash
# Quick capture (most common)
brain add "<text>" --type <type> [--tags a,b] [--link <other_id>]

# Capture a task
brain add "<text>" --type task [--status open]

# Capture with timestamp override (user recalls something from earlier)
brain add "<text>" --type note --ts 2026-04-22T09:00Z

# Recap the week
brain timeline --last 7d

# Filter retrieval
brain timeline --last 30d --type decision
brain timeline --tag <tag>

# Write a rendered artifact the user can read
brain timeline --last 7d --format md    # writes renders/timelines/<range>.md

# Read one event
brain show <id>
```

## Environment

- The vault path is in `$BRAIN_DIR`. Never hardcode a path.
- You do not need to pass `--vault` unless the user asks you to operate on a different one.
- You do not need to pass `--agent`. You are auto-detected.

## Rules — do not violate

1. **The vault markdown folder is truth.** Treat cache/renders/audit as derivative. Never edit `.brain/cache.sqlite` or `audit/*.jsonl` by hand.
2. **Never invent an event type, status, or source.** Use only the enums advertised in `next_actions` or this file.
3. **Never edit the `id`, `created_at`, or `hash` of an existing event.** If content changes, the user (or a future edit tool) should rewrite the body; `hash` is recomputed on `brain reindex`.
4. **Prefer many small captures over one large one.** One event per thought/decision/task. Linking is free (`--link`).
5. **Read the `fix` field on every error.** It tells you exactly what to do next.
6. **Don't summarize the user's own words unnecessarily.** Capture the phrasing they used; they can edit later.
7. **When you capture something on the user's behalf, tell them briefly** ("Captured decision · `01K…`"). Don't narrate every flag.

## On user-facing brevity

The user values short, informative responses. When reporting a capture or a retrieval result, lead with the outcome. Don't re-paste the whole JSON envelope at them.
