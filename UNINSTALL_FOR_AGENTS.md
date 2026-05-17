# Uninstall Living Second Brain For Agents

You are an AI agent removing Living Second Brain for a non-technical user.
Do the work yourself when you have terminal access. The user must feel safe:
remove the tool and agent instructions, but never delete their vault unless
they explicitly ask you to delete their saved notes too.

## What To Remove

- The `brain` CLI binary installed by Go.
- Platform instruction files:
  - Cursor: `.cursor/rules/brain.mdc`
  - Claude Code / Cowork: `~/.claude/skills/brain.md`
  - Windsurf: `.windsurf/rules/brain.md`
  - OpenAI Codex: the managed Living Second Brain block in `AGENTS.md`.
- Optional user data vault:
  - `$BRAIN_DIR` if set.
  - Otherwise `~/brain`.

## Safety Rules

- Ask before removing anything.
- Ask separately before deleting the vault.
- Treat the vault as user data, not app cache.
- If you are not sure whether a file belongs to Living Second Brain, keep it
  and tell the user.
- After uninstall, verify that `brain` is no longer on `PATH`.

## 1. Confirm Scope

Ask:

```text
I can remove Living Second Brain. Should I keep your saved notes vault, or delete the vault too?
```

Default to keeping the vault.

## 2. Run The Uninstaller

Private repo, when `gh` is authenticated:

```bash
gh api -H "Accept: application/vnd.github.v3.raw" /repos/Habibi-7/living-brain/contents/uninstall.sh | sh
```

Public repo:

```bash
curl -fsSL https://raw.githubusercontent.com/Habibi-7/living-brain/main/uninstall.sh | sh
```

If the user explicitly wants everything deleted, including saved notes:

```bash
curl -fsSL https://raw.githubusercontent.com/Habibi-7/living-brain/main/uninstall.sh | sh -s -- --purge-vault --yes
```

If you are already inside a local checkout of this repository:

```bash
sh uninstall.sh
```

To remove the vault too from a local checkout:

```bash
sh uninstall.sh --purge-vault
```

When running from a non-interactive pipe, use `--purge-vault --yes` only after
the user explicitly confirmed that saved notes should be deleted.

## 3. Platform-Specific Cleanup

The uninstaller removes platform instruction files from the current directory.
For Cursor, Windsurf, and Codex, run it from each workspace where Living Second
Brain was installed.

You can target one platform:

```bash
sh uninstall.sh --cursor
sh uninstall.sh --claude
sh uninstall.sh --windsurf
sh uninstall.sh --codex
```

## 4. Verify

Run:

```bash
command -v brain
```

Expected result: no output.

If it still prints a path, remove that binary only after confirming it is the
Living Second Brain CLI:

```bash
brain version
```

Then remove the printed binary path if appropriate.

## 5. Finish

If the vault was kept:

```text
Living Second Brain has been removed. Your saved notes vault was kept.
```

If the vault was deleted:

```text
Living Second Brain has been removed, including the saved notes vault.
```
