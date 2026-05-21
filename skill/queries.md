# HBrain — query recipes

**Read this when:** you need to query the vault directly (no CLI, or a
query the CLI doesn't cover).

Otherwise stay in `SKILL.md`. The fast path for common queries is the
`brain` CLI:

```bash
brain search <query>      # full-text
brain tasks               # open tasks
brain stale 14            # tasks open > 14 days
brain stats               # vault counts
brain timeline 30         # last 30 days
```

The recipes below are for direct file access when the CLI is missing or
when you need something the CLI doesn't expose.

---

## Recipes

### List recent events

```bash
# All events from the last 7 days (macOS)
find $BRAIN_DIR/events -name "*.md" -mtime -7 | sort

# All events from a specific month
ls $BRAIN_DIR/events/2026/05/*/
```

### Filter by type

```bash
grep -rl "^type: decision" $BRAIN_DIR/events/ | sort
```

### Filter by tag

```bash
grep -rl "tags:.*backend" $BRAIN_DIR/events/ | sort
```

### Find by content

```bash
grep -rl "postgres" $BRAIN_DIR/events/ | sort
```

### List open tasks

```bash
grep -rl "^status: open" $BRAIN_DIR/events/ | sort
```

### Read one event

Read the file directly with your file tools. The frontmatter has metadata;
the body has content.

### Update a task status

Read the file, change `status: open` to `status: done`, write it back.
Never change the `id` or `created_at` fields.

---

## Complex queries

For queries the recipes above don't cover (date ranges combined with type
filters, multi-tag intersections, joining on `links:`), read the
candidate files' frontmatter and filter in your reasoning. You have your
full file-tool surface — use whatever approach works.

Common pattern:

1. Narrow by date with `find … -mtime` or by walking
   `events/YYYY/MM/DD/`.
2. Narrow by one cheap predicate with `grep -l`.
3. Read the remaining files and filter the rest in memory.
