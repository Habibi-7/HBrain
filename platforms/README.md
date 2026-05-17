# Platform adapters

`skill/SKILL.md` is the source of truth. Platform files are generated at install
time so the prompt logic does not drift across Cursor, Windsurf, Copilot, and
Claude Code.

| Platform | Generated install path |
|----------|------------------------|
| **Cursor** | `.cursor/rules/brain.mdc` in your project |
| **Windsurf** | `.windsurf/rules/brain.md` in your project |
| **GitHub Copilot** | `.github/copilot-instructions.md` |
| **Claude Code / Cowork** | `~/.claude/skills/brain.md` |
| **Any agent / API** | Paste `skill/SKILL.md` or its body into the system prompt |

## Quick install

Use the installer. It wraps the canonical skill for the target platform:

```bash
sh install.sh --cursor
sh install.sh --windsurf
sh install.sh --copilot
sh install.sh --claude
```

Add `--no-cli` to install only the agent instruction file and skip the optional
Go helper.

## What changes per platform

Only two things change:

1. **Wrapper/frontmatter** — platform-specific metadata such as `alwaysApply`.
2. **`agent` example value** — set to `cursor`, `windsurf`, or `copilot` so examples are clear.

The vault format, event schema, capture rules, and HTML artifact contract come
from `skill/SKILL.md`.
