#!/usr/bin/env bash
# HBrain SessionStart hook.
# Emits hookSpecificOutput.additionalContext that Claude Code injects into
# every turn for the rest of the session, so the agent always knows:
#   - the vault path (or that it's ephemeral and not mounted)
#   - its own agent identity (claude-code, cursor, cowork, etc.)
#   - that it's in HBrain capture-first mode
#
# Keep the context under ~250 chars to avoid bloat over long sessions.

set -u

plugin_root="${CLAUDE_PLUGIN_ROOT:-}"
brain_bin="${plugin_root}/bin/brain"

# Fall back to PATH if the plugin's bundled binary isn't there yet (dev mode).
if [ ! -x "$brain_bin" ]; then
  brain_bin="$(command -v brain 2>/dev/null || true)"
fi

# ── Agent identity heuristics ─────────────────────────────────────────────
detect_agent() {
  if [ -n "${CLAUDECODE:-}${CLAUDE_CODE_SSE_PORT:-}${CLAUDE_AGENT_PATH:-}" ]; then
    echo "claude-code"; return
  fi
  if [ -n "${COWORK_SESSION_ID:-}${COWORK_AGENT_NAME:-}" ]; then
    echo "cowork"; return
  fi
  if [ -n "${CURSOR_TRACE_ID:-}${CURSOR_AGENT:-}" ]; then
    echo "cursor"; return
  fi
  if [ -n "${WINDSURF_USER_ID:-}" ]; then
    echo "windsurf"; return
  fi
  if [ -n "${CODEX_SESSION:-}" ]; then
    echo "codex"; return
  fi
  echo "agent"
}

# ── Vault discovery ───────────────────────────────────────────────────────
vault_path="${BRAIN_DIR:-$HOME/brain}"
ephemeral=""

# Cheap ephemeral heuristics. Mirrors tool/internal/vault/IsEphemeral*.
case "$HOME" in
  /sessions/*) ephemeral="HOME under /sessions/" ;;
esac
if [ -z "$ephemeral" ] && [ -e /.dockerenv ]; then
  ephemeral="/.dockerenv present"
fi
if [ -z "$ephemeral" ] && [ -e /run/.containerenv ]; then
  ephemeral="/run/.containerenv present"
fi

agent="$(detect_agent)"

# ── Compose additionalContext ─────────────────────────────────────────────
if [ -n "$ephemeral" ] && [ ! -d "$vault_path" ]; then
  ctx="HBrain active · agent: ${agent} · vault: ephemeral env (${ephemeral})
Before capturing: ask the user to mount a persistent folder and set BRAIN_DIR. See skills/hbrain/vault-setup.md §1a. Do NOT silently save to ephemeral storage."
else
  ctx="HBrain active · vault: ${vault_path} · agent: ${agent}
Capture-first mode. Use \`agent: ${agent}\` in event frontmatter. For views, prefer the \`brain\` CLI fast path (e.g. \`brain timeline --format html\`)."
fi

# ── JSON output ───────────────────────────────────────────────────────────
# Escape newlines and quotes for safe JSON.
ctx_escaped=$(printf '%s' "$ctx" | sed 's/\\/\\\\/g; s/"/\\"/g' | awk 'BEGIN{ORS=""} {if (NR>1) printf "\\n"; print}')

cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "${ctx_escaped}"
  }
}
EOF
