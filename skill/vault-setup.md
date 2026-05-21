# HBrain — vault setup

**Read this when:** first install of a session, `brain doctor` reports
trouble, you need to mount a vault, or you need to manage vault structure.

Otherwise stay in `SKILL.md`.

---

## 1. The vault

The vault is a folder of markdown files the user owns. It MUST live on
persistent storage — the user's real machine — not inside an ephemeral
sandbox or VM home.

### 1a. Sandbox check (run before the first capture, every session)

If you are running inside a sandboxed agent (Cowork, computer-use VM,
hosted notebook, Docker container), `$HOME` is wiped when the session
ends. Events written there will be lost.

Heuristics that signal an ephemeral environment:

- `$HOME` starts with `/sessions/` (Cowork session containers).
- `/.dockerenv` or `/run/.containerenv` exists.
- `hostname` is `claude`, a random hex string, or a generic container name.

If any of these match, the default flow is:

1. Tell the user the environment is ephemeral and the vault would be lost.
2. Ask them to connect / mount a folder from their real machine
   (e.g., `~/brain` on their Mac) into the sandbox.
3. Ask for the mount path inside the sandbox (Cowork typically reports it
   when a folder is granted).
4. Set `BRAIN_DIR` to the mount path for this session.
5. Confirm with `brain doctor` (or by listing the dir) that the path is
   present and writable.

**Override.** If the user explicitly says to capture anyway ("just do it",
"save it anyway", "ignore the warning"), capture into the ephemeral vault
AND prefix every confirmation with `⚠ ephemeral`. Example:

```
⚠ ephemeral · ✓ task saved · 01JVM... (will be lost when session ends)
```

Never silently save to ephemeral storage. Either persistent vault or
warned.

If the `brain` CLI is installed, `brain doctor` does this check for you
and prints `HOME`, `BRAIN_DIR`, the resolved vault path, and any
ephemeral warnings.

The only safe local environments are: the user's own laptop/desktop
(Cursor, Claude Code, Codex CLI, Windsurf), or a sandbox with an
explicitly mounted persistent folder.

### 1b. Finding the vault

1. If `$BRAIN_DIR` is set AND points to a persistent path, use it.
2. Otherwise, if running on a local agent (no sandbox markers), ask the
   user once: "Where should I keep your brain vault?" Default suggestion:
   `~/brain`.
3. Otherwise (sandbox detected, no `BRAIN_DIR`), refuse to capture and
   follow §1a.
4. **Remember the path** for the rest of the session.

### 1c. Creating a new vault (first time only)

```bash
mkdir -p "$BRAIN_DIR/events" "$BRAIN_DIR/renders" "$BRAIN_DIR/.brain/templates"
```

Copy the templates from this skill's `templates/` directory into
`$BRAIN_DIR/.brain/templates/` if they don't already exist. Templates are
defaults, not cages — users can override per-vault.

---

## 2. Vault structure

```
vault/
├── events/
│   └── YYYY/MM/DD/<ulid>-<slug>.md   # one file per event
├── renders/                            # saved view artifacts
└── .brain/
    └── templates/                      # per-vault template overrides
        ├── timeline.html
        └── tasks.html
```

### Editing events

Users can edit event files directly in any editor. You can also edit them
(e.g., marking a task done). **Never change the `id` or `created_at`
fields.**

### What not to do

- Don't create proprietary formats. Everything is plain markdown.
- Don't summarize the user's words when capturing. Use their phrasing.
- Don't invent event types or statuses beyond the defined set
  (see `SKILL.md` §1).
