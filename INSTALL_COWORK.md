# Install HBrain in Cowork

## One sentence

Paste into Cowork chat:

> Run `npx hbrain install`.

That's it. The installer drops the skill into `~/.claude/skills/hbrain/`,
creates `~/brain/` as the vault if missing, copies templates, runs the
sandbox check, and prints `HBrain is ready`. The agent reads SKILL.md
on its own from then on.

If your Cowork session has your local machine connected (the common
case), `~` is your real home and the vault persists across sessions.

---

## If `npx hbrain install` fails

A couple of things can break it:

### Cowork sandbox without a local-machine connector

If Cowork is running purely server-side (no Mac/PC connector), then `~`
is ephemeral — everything saved there dies with the session. The
installer detects this and refuses to capture into ephemeral storage.

Fix: connect a folder from your real machine via Cowork's **+** button →
"Add folder". Then re-run `npx hbrain install` with a custom vault path:

```text
npx hbrain install --vault /sessions/<id>/brain
```

(Use the path Cowork printed when you mounted the folder.)

### npm not available

Some Cowork sandboxes don't ship Node by default. Workaround — paste:

> Clone `github.com/Habibi-7/hbrain`, copy `skills/hbrain/` to
> `~/.claude/skills/hbrain/`, create `~/brain/events/`, and respond
> with `HBrain ready · vault: ~/brain`.

This skips the npm installer and does the same work by hand. Same end
state.

---

## What works in Cowork vs Claude Code CLI

| Feature | Claude Code CLI | Cowork |
| --- | --- | --- |
| Skill (capture, query, templates) | ✅ | ✅ |
| `brain` CLI binary on PATH | ✅ (plugin bundles it) | ⚠ Only if npm + Go reachable in sandbox |
| Slash commands (`/hbrain:timeline`, …) | ✅ | ❌ Use plain English |
| SessionStart hook (auto-detect every turn) | ✅ | ⚠ Cowork may not honor plugin hooks |

In Cowork, HBrain degrades to skill-only behavior. Capture and template
rendering still work because the skill carries them.

---

## After install

Talk normally:

```text
"I think Postgres is the right call because of native JSON."
→ captures a decision

"Remember to review the auth PR before Friday."
→ captures a task with due date

"Show me my week."
→ renders an HTML timeline artifact
```

No magic phrases needed. The skill teaches semantic judgment.

---

## Compare: Claude Code CLI

```bash
claude
# inside the REPL:
/plugin marketplace add Habibi-7/hbrain
/plugin install hbrain
```

Plugin install gets you the SessionStart hook, slash commands, and
bundled binary — full experience. Cowork users get the skill-only
subset, which is most of the value.
