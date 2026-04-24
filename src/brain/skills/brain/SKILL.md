---
name: brain
description: |
  Capture and retrieve personal notes, tasks, decisions, facts, and saved
  links using the `brain` CLI — a local markdown-backed second brain. Use
  whenever the user states something worth remembering, gives themselves a
  task, shares a URL or quote, or asks what they captured / decided / did
  in the past. Prefer capturing silently over asking permission — a lost
  thought is worse than a stray event.
triggers:
  # Direct invocations
  - brain
  - /brain
  # Capture intent
  - remember that
  - remember this
  - note that
  - note this
  - save this
  - save that
  - bookmark this
  - bookmark that
  - capture this
  - capture that
  - jot down
  - write this down
  - add to my brain
  - add to my notes
  - take a note
  # Task intent
  - remind me to
  - i should
  - i need to
  - todo
  - add a todo
  - add a task
  - don't let me forget
  - make sure i
  # Decision intent
  - i decided
  - i've decided
  - i'm going with
  - we decided
  - the decision is
  # Retrieval intent
  - what did i
  - when did i
  - what have i
  - what was that thing
  - what did we decide
  - what was my decision
  - recap my
  - recap of
  - show my week
  - show my day
  - show me my notes
  - show me my tasks
  - what's in my brain
  - my timeline
  - my recent notes
  - my open tasks
  - list my tasks
  # Tool-specific
  - brain add
  - brain timeline
  - brain show
  - brain init
---

# brain — Living Second Brain skill

You are using `brain`, a local CLI that stores everything as markdown files
the user owns. Every command returns a JSON envelope with `next_actions[]`
and a `fix` on errors — read them, don't guess.

## First: is there a vault?

Before the first `brain add`, make sure a vault exists. In order:

1. If `$BRAIN_DIR` is set, use it — no setup needed. Just run commands.
2. Else run `brain --agent` (no args). The envelope tells you the state.
3. If there is no vault, ask the user where to put it, then:
   ```
   brain init <path>
   export BRAIN_DIR=<path>   # or pass --vault <path> each call
   ```
4. If the user doesn't have a preference, default to `~/brain` and tell them.

Don't silently create a vault in a random directory.

## Capture playbook

The default call:

```
brain add "<body>" --type <type> [--tags a,b] [--link <other_id>]
```

Pick the type — **only** these five exist:

| Type | Use when |
| --- | --- |
| `note` | Freeform thought, observation, idea. Default if unsure. |
| `task` | Something to do. Adds `--status open` automatically. |
| `decision` | "I chose X because Y." Preserve the reasoning in the body. |
| `fact` | External reference: quote, spec, number, source. |
| `link` | A URL the user wants to keep. Body = URL + optional commentary. |

Rules you must not break:

- **Capture the user's own phrasing.** Don't paraphrase, don't summarize, don't correct. They can edit the file later.
- **One thought per event.** If they say three things, make three `brain add` calls. Linking is free (`--link <id>`).
- **If in doubt, capture as `note`.** Wrong type is a cheap mistake; a missed thought is not.
- **Tell the user briefly that you captured.** Example: `Captured decision · 01K…`. Don't re-print the whole envelope.
- **Never invent a `type`, `status`, or `source`.** Only use the enums listed in `next_actions` or this file.

### Common variations

```bash
# Task with explicit status
brain add "ship v0.2 before Friday" --type task --status open

# Pipe body from elsewhere
echo "use ULID for event ids" | brain add --type decision

# Capture a URL with commentary
brain add "https://example.com/article — good take on agent memory" --type link --tags reading

# Backdate (user recalls something from earlier)
brain add "had the database idea in the shower" --type note --ts 2026-04-22T09:00Z

# Link to an earlier event
brain add "followup: added index after benchmark" --type note --link 01K...
```

## Retrieval playbook

```bash
brain timeline                       # default range (last 7d)
brain timeline --last 30d
brain timeline --last 7d --type decision
brain timeline --tag reading
brain timeline --since 2026-04-01 --until 2026-04-15
brain timeline --last 7d --format md   # writes a rendered markdown file
brain show <id>                        # read one event
```

Results come back with `next_actions` — use them verbatim, filling in any
`params.value` or picking from `params.enum`.

## The envelope contract

Every command's JSON (agent mode is auto-detected in your shell):

```
success: { ok: true,  command, result, next_actions[], metrics }
error:   { ok: false, command, error{code,message,retryable}, fix, next_actions[], metrics }
```

Exit codes: `0` success · `2` user error · `3` retryable · `4` no vault · `1` unexpected.

On error, the `fix` field tells you exactly what to do. Follow it instead
of guessing a different command.

## Do not

- Edit files under the vault by hand. Use `brain` commands.
- Edit `.brain/cache.sqlite` or `audit/*.jsonl` — these are derivative.
- Change an existing event's `id`, `created_at`, or `hash`.
- Guess at flags. Run `brain <command> --help` or `brain` (no args) to see
  the self-documenting command tree.

## Output style toward the user

The user values short, informative responses. When reporting a capture:

- **Good:** "Captured decision · `01KPZZ5Z8HN9DJ7ZPBD47N4Q0H`."
- **Bad:** (re-printing the full JSON envelope)

When retrieving a timeline, summarize the shape (N events, types, date
range), then list the most relevant ones. Don't dump the whole JSON.
