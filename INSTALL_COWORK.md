# Install HBrain in Cowork

This guide is for **Cowork on claude.ai** — the agent surface that runs in
the web browser. If you're using **Claude Code (the terminal `claude`
command)**, see the main [README](./README.md) instead. The plugin
marketplace flow (`/plugin marketplace add Habibi-7/hbrain`) only works
in Claude Code CLI.

---

## The two-sentence install

Cowork's sandbox is ephemeral — its `$HOME` is wiped between sessions —
so the vault must live on **your real machine**. That's the one
non-negotiable step. Everything else is one paste.

### Step 1 — Mount a folder from your real machine

Open Cowork's folder connector (the **+** button in the chat composer →
"Add folder") and share a folder from your local machine. Recommended:
create or pick `~/brain` on your Mac/PC.

After mounting, Cowork prints the path where it lives inside the
sandbox. It typically looks like `/sessions/<id>/brain` or similar.

> **Important.** Without this step, anything HBrain captures will be lost
> when the Cowork session ends. The skill refuses to silently save to
> ephemeral storage.

### Step 2 — Paste the install prompt

Paste this into Cowork chat, replacing `<MOUNTED_PATH>` with the path
Cowork reported in step 1:

```
Install HBrain. Clone github.com/Habibi-7/hbrain into this session, copy
skills/hbrain/ into your skill discovery path, and set BRAIN_DIR to
<MOUNTED_PATH>. Then read skills/hbrain/SKILL.md and skills/hbrain/vault-setup.md,
confirm the vault is persistent, and respond with `HBrain ready · vault:
<MOUNTED_PATH>`. Don't propose example prompts — just wait for input.
```

That's it. Cowork's agent reads SKILL.md, runs the sandbox check (which
now passes because of the mount), and goes silent until you talk to it.

After step 2, every new Cowork session that mounts the same folder will
see HBrain again and the agent picks up where it left off.

---

## What you get vs what's missing

Cowork is a different runtime than Claude Code CLI. Some plugin features
in HBrain don't fire in Cowork:

| Feature | Claude Code CLI | Cowork |
| --- | --- | --- |
| `SessionStart` hook (auto-detect vault + identity) | ✅ Every turn | ⚠ Best-effort (Cowork may not honor) |
| Slash commands (`/hbrain:timeline`, etc.) | ✅ | ❌ Use plain English instead |
| Bundled `brain` CLI on PATH | ✅ | ❌ Sandbox may refuse to exec |
| Skill (capture rules, templates, design system) | ✅ | ✅ Works the same |
| Vault mounting | Local file system | Cowork's folder connector |

In Cowork, HBrain is **skill-only** in practice. Capture, query, and
template-filled views work. The `brain` binary fast path and slash
commands degrade gracefully — the agent falls back to direct vault
reads.

---

## After install — how to use it

Talk normally:

```
I think Postgres is the right choice because of native JSON.
→ captures a decision
```

```
Remember to review the auth PR before Friday.
→ captures a task with due date
```

```
Show me my week.
→ renders an HTML timeline artifact
```

```
What did I decide about the database?
→ answers from the markdown vault
```

The skill teaches the agent semantic judgment — no magic phrases needed.

---

## Troubleshooting

**Q. The agent keeps asking me to mount a folder even after I did.**
The mount step in Cowork sometimes resets between sessions if the
connector wasn't saved. In the folder-picker, make sure "Remember this
folder" (or equivalent) is checked.

**Q. The agent saved something but I can't find it.**
Check the path. It must be the **mounted** path (e.g.
`/sessions/.../brain`), not `~/brain` directly. The skill should print
the full ULID-prefixed filename — find it under `events/YYYY/MM/DD/`.

**Q. I want HBrain in Cowork without the mount step.**
Not supported. Anything saved to Cowork's ephemeral storage dies with
the session. If you accept that risk, prefix every capture with
`⚠ ephemeral` and capture into `$HOME/brain` inside the sandbox — but
expect to lose it.

**Q. Will there be a one-click install for Cowork?**
Yes — see [HH-618](https://linear.app/hhabibi/issue/HH-618). We're
packaging HBrain as a Cowork `.plugin` file and submitting it to
Anthropic's community marketplace. Until that lands, the two-step
install above is the path.

---

## Compare: Claude Code CLI (no mount step)

If you ever switch to Claude Code in a terminal, install in one line:

```bash
claude
# inside the REPL:
/plugin marketplace add Habibi-7/hbrain
/plugin install hbrain
```

The CLI uses your real `$HOME`, so no mounting needed. SessionStart hook
fires every turn, slash commands work, the `brain` binary is on PATH.
That's the full plugin experience.
