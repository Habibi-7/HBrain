# HBrain Privacy Policy

**Short version: HBrain does not collect, transmit, or store your data
anywhere except on your own machine.** This file documents that
explicitly because plugin marketplaces ask for a privacy policy URL.

## What HBrain is

HBrain is a Claude Code plugin (also installable as a plain skill in
other agents) that teaches your agent to:

1. Capture durable thoughts (notes, tasks, decisions, facts, links) as
   plain markdown files in a folder you choose on your own machine
   (default: `~/brain/`)
2. Read those markdown files back when you ask questions about them
3. Render Linear-style HTML views (timeline, task board, charts) from
   that markdown

That is the entire scope of the product.

## Data HBrain handles

| Data | Where it lives | Who can see it |
| --- | --- | --- |
| Your captured notes, tasks, decisions, facts, links | Plain markdown files in your local vault directory (`$BRAIN_DIR`, default `~/brain/`) | You. Whoever has access to that folder on your machine. |
| Rendered HTML artifacts | Temporary files in your OS temp directory, opened in your local browser | You. |
| Optional saved renders | `$BRAIN_DIR/renders/` if you explicitly ask to save | You. |
| Cached `brain` CLI binary | `~/.cache/hbrain/v<version>/` if you use the plugin's bundled CLI | You. |

## Data HBrain does NOT do

- HBrain does not collect telemetry, analytics, usage data, error
  reports, crash reports, or any other signals.
- HBrain does not phone home to any server.
- HBrain has no accounts, no sign-up, no API keys.
- HBrain does not transmit your captured data anywhere. Your markdown
  files stay in the directory you chose, on your machine, full stop.
- HBrain does not read or modify anything outside `$BRAIN_DIR` (the
  vault path you configured) without your explicit instruction.

## Network requests HBrain does make

The plugin makes exactly one optional network request, and only the
first time you run the bundled `brain` CLI on a new machine or new
plugin version:

1. **First-run binary download.** `bin/brain` is a shim script. The
   first time it runs, it downloads the matching pre-built binary
   (`brain-<os>-<arch>`) from this project's public GitHub Releases
   page (`https://github.com/Habibi-7/hbrain/releases/`). The binary is
   cached locally; subsequent runs never hit the network. GitHub may
   log the download request the same way it logs any anonymous file
   download. No user data is sent.

That's it. No other network activity.

## Your data, your rules

The vault is your folder. Delete it, move it, edit the markdown files
in any text editor, back it up to git, sync it with Dropbox/iCloud,
encrypt it, or destroy it. HBrain has no say over any of that.

## Third parties

HBrain does not share, sell, or transmit data to any third party.

The plugin runs inside Claude Code (or Cowork, Cursor, etc.). Those
host platforms have their own privacy policies governing what they
do with your conversation. HBrain does not change anything about
that.

## Changes

If this policy ever changes (e.g. a future version adds an opt-in
sync feature), the change will land in this file in git. Watch this
repository for updates.

## Contact

Open an issue at https://github.com/Habibi-7/hbrain/issues.
