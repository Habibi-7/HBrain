# Platform adapters

Drop the right file into the right place. The skill content is identical across
all platforms — only the wrapper and install path differ.

| Platform | File | Install path |
|----------|------|-------------|
| **Cursor** | `cursor.mdc` | `.cursor/rules/brain.mdc` in your project |
| **Windsurf** | `windsurf.md` | `.windsurf/rules/brain.md` in your project |
| **GitHub Copilot** | `copilot.md` | `.github/copilot-instructions.md` (create or append) |
| **Claude Code** | `skill/SKILL.md` | `~/.claude/skills/brain.md` |
| **Any agent / API** | `system-prompt.md` | Paste into system prompt or agent config |

## Quick install

**Cursor:**
```bash
mkdir -p .cursor/rules
cp path/to/living-brain/platforms/cursor.mdc .cursor/rules/brain.mdc
```

**Windsurf:**
```bash
mkdir -p .windsurf/rules
cp path/to/living-brain/platforms/windsurf.md .windsurf/rules/brain.mdc
```

**Copilot:**
```bash
mkdir -p .github
cp path/to/living-brain/platforms/copilot.md .github/copilot-instructions.md
```

**Claude Code:**
```bash
cp path/to/living-brain/skill/SKILL.md ~/.claude/skills/brain.md
```

## What's different between files

Only two things change per platform:
1. **Frontmatter** — platform-specific header (`alwaysApply`, `description`, etc.)
2. **`agent` field** — set to the platform name so events are tagged by source

The vault format, event schema, and capture rules are identical everywhere. Events
written by a Cursor agent are readable by the `brain` CLI and by any other agent.
