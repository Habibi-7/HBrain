# Install HBrain For Agents

You are an AI agent setting up HBrain for a non-technical user.
Do the work yourself when you have terminal access. Ask the user only for
permission, credentials, or a vault location preference.

## Goal

After setup, the user should be able to say:

```text
I have been thinking about switching to Tailwind because the design work is moving faster
what did I decide about the database?
show my week
show my open tasks
```

The agent should use judgment to capture durable signals, query plain markdown
files in the user's vault, and render rich HTML artifacts when the user asks for
visual views.

## Safety Rules

- Ask before installing software, downloading from GitHub, or creating a vault.
- Default the vault to `~/brain` if the user has no preference.
- Do not overwrite an existing vault.
- Do not require the user to run commands if you can run them.
- Do not clone the repository unless the user explicitly asks you to.
- If a command fails, explain the exact blocker and the next action.

## 1. Confirm Setup

Ask:

```text
I can set up HBrain for you. It stores plain markdown notes in a local folder. Use ~/brain as the vault?
```

If the user chooses another path, use that path as `BRAIN_DIR`.

## 2. Install HBrain

Use the npm installer. Do not use raw GitHub URLs as the primary install path.

Default:

```bash
npx hbrain install
```

If you know the target platform, pass the matching flag:

```bash
# Cursor
npx hbrain install --cursor

# Claude Code / Cowork
npx hbrain install --claude

# OpenAI Codex
npx hbrain install --codex

# Windsurf
npx hbrain install --windsurf
```

Use a custom vault:

```bash
npx hbrain install --cursor --vault ~/Dropbox/brain
```

### If installation fails

Stop and report the exact blocker. Do not partially install from copied web-page
content. Do not clone the repo as a workaround unless the user explicitly asks
you to clone it.

If you are already inside a local checkout of this repository, use the local
installer so platform wrappers are generated from `skill/SKILL.md`:

```bash
sh install.sh --cursor --no-cli    # or --claude, --codex, --windsurf
```

The installer also installs the optional `brain` CLI when Go is available. If
you only need the CLI from a local checkout:

```bash
cd tool
make install
```

## 3. Create Or Reuse The Vault

If the user approved the default:

```bash
export BRAIN_DIR="$HOME/brain"
```

If the user chose a custom path:

```bash
export BRAIN_DIR="<user-chosen-path>"
```

Create the vault if it does not already exist:

```bash
mkdir -p "$BRAIN_DIR/events" "$BRAIN_DIR/renders" "$BRAIN_DIR/.brain/templates"
```

If you are inside a local checkout, copy templates when available:

```bash
cp -n skill/templates/* "$BRAIN_DIR/.brain/templates/" 2>/dev/null || true
```

## 4. Verify

Check the CLI:

```bash
brain version
brain stats
brain tasks
```

Expected result:

- `brain version` prints a version.
- `brain stats` can read the vault, even if it has zero events.
- `brain tasks` prints no open tasks or an empty task view.

The CLI is optional. If it is unavailable, the installed skill still teaches the
agent to read and write the markdown vault directly.

If `brain` is not found, check Go's bin directory:

```bash
go env GOPATH
```

The binary is usually at `$(go env GOPATH)/bin/brain`. Add that directory to
the user's shell path if needed.

## 5. Finish

Tell the user only:

```text
HBrain is ready. You can talk naturally, ask for your open tasks, or ask for a visual timeline.
```

Do not explain the implementation unless the user asks.
