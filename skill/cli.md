# HBrain — `brain` CLI reference

**Read this when:** you need a `brain` invocation beyond the common ones
already shown in `SKILL.md` (`timeline`, `tasks`, `doctor`).

Otherwise stay in `SKILL.md`. Common usage:

```bash
brain doctor                         # vault path + ephemeral warning
brain timeline --format html         # open timeline in browser
brain tasks --format html            # open task board in browser
```

The CLI is a deterministic helper, not the brain itself. If the CLI is
missing on the user's machine, read and write the markdown vault
directly (see `queries.md`).

---

## Full command surface

```
brain <command> [args]

Commands:
  timeline [days] [--format html|json|text]
                          Render the timeline. Default: 7 days, html.
                          html opens result in browser; json|text → stdout.
  tasks [status|all] [--format html|json|text]
                          List tasks. Default: open, text. "all" disables
                          the status filter. html opens in browser.
  search <query>          Full-text search across all events.
  stale [days]            List open tasks older than N days. Default: 14.
  stats                   Vault counts by type, status, recency.
  doctor                  Vault path + persistence check. Run once per session.
  where                   Alias for doctor.
  skill <subcommand>      Manage user skills (see below).
  version                 Print version.
  help                    Print usage.
```

### `--format` flag

Three views (`timeline`, `tasks`) support `--format`:

| Format | Behavior |
| --- | --- |
| `html` | Renders to a temp file and opens in the user's browser. Prints the file path. Default for `timeline`. |
| `json` | Stable envelope: `{"meta": {...}, "events": [...]}` or `{"meta": {...}, "tasks": [...]}`. Print to stdout. Intended for agent consumption when building custom artifacts. |
| `text` | Plain-text rendering to stdout. Default for `tasks`. |

When the user asks for a custom HTML view (chart, dashboard) and you
want a clean data source, run `brain timeline --format json` or
`brain tasks --format json` and consume the envelope rather than
re-parsing the vault.

---

## `brain skill` subcommands

```
brain skill list
brain skill show <name>
brain skill create <name> [description]
brain skill path <name>
```

User-defined skills live at `$BRAIN_DIR/skills/`. Each is a directory
with a `SKILL.md` that defines event types, triggers, and capture rules
for a specific domain (e.g. fitness, reading, recipes). These extend
HBrain — they do not replace it.

---

## Template overrides

If a vault contains `.brain/templates/<view>.html`, the CLI prefers it
over the binary's embedded template. To regenerate a vault's templates
from this skill's canonical copies:

```bash
cp -r skill/templates/* $BRAIN_DIR/.brain/templates/
```

Don't do this without asking — user may have hand-customized their
overrides.
