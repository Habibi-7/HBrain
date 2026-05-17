#!/usr/bin/env sh
set -e

PURGE_VAULT=0
YES=0
REMOVE_CURSOR=1
REMOVE_CLAUDE=1
REMOVE_WINDSURF=1
REMOVE_CODEX=1
MANAGED_BEGIN="<!-- BEGIN HBRAIN -->"
MANAGED_END="<!-- END HBRAIN -->"

info() { printf '  %s\n' "$*"; }
ok() { printf '  OK %s\n' "$*"; }
warn() { printf '  ! %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
brain uninstaller

Usage:
  sh uninstall.sh [options]

Options:
  --cursor       Remove only Cursor instructions from the current directory
  --claude       Remove only Claude Code / Cowork skill from ~/.claude
  --windsurf     Remove only Windsurf instructions from the current directory
  --codex        Remove only OpenAI Codex instructions from AGENTS.md
  --purge-vault  Also delete the vault directory (requires confirmation)
  --yes          Skip prompts where safe; vault purge still requires --purge-vault
  --help         Show this help

By default, removes the brain CLI and all known platform instruction files.
Vault files are user data and are kept unless --purge-vault is passed.
EOF
}

explicit_platform=0
for arg in "$@"; do
  case "$arg" in
    --cursor|--claude|--windsurf|--codex)
      explicit_platform=1
      ;;
  esac
done

if [ "$explicit_platform" -eq 1 ]; then
  REMOVE_CURSOR=0
  REMOVE_CLAUDE=0
  REMOVE_WINDSURF=0
  REMOVE_CODEX=0
fi

for arg in "$@"; do
  case "$arg" in
    --cursor) REMOVE_CURSOR=1 ;;
    --claude) REMOVE_CLAUDE=1 ;;
    --windsurf) REMOVE_WINDSURF=1 ;;
    --codex) REMOVE_CODEX=1 ;;
    --purge-vault) PURGE_VAULT=1 ;;
    --yes) YES=1 ;;
    --help|-h) usage; exit 0 ;;
    *) die "unknown option: $arg" ;;
  esac
done

looks_owned() {
  path="$1"
  [ -f "$path" ] && grep -q "HBrain" "$path"
}

remove_owned_file() {
  path="$1"
  label="$2"
  if [ ! -e "$path" ]; then
    info "$label not found: $path"
    return
  fi
  if looks_owned "$path"; then
    rm -f "$path"
    ok "removed $label: $path"
  else
    warn "kept $label because it does not look like an HBrain file: $path"
  fi
}

remove_cli_at() {
  path="$1"
  [ -n "$path" ] || return
  if [ -f "$path" ]; then
    rm -f "$path"
    ok "removed brain CLI: $path"
  fi
}

remove_managed_block() {
  path="$1"
  label="$2"
  if [ ! -f "$path" ]; then
    info "$label not found: $path"
    return
  fi
  if ! grep -q "$MANAGED_BEGIN" "$path"; then
    info "$label has no HBrain block: $path"
    return
  fi
  awk -v begin="$MANAGED_BEGIN" -v end="$MANAGED_END" '
    $0 == begin { skip = 1; changed = 1; next }
    $0 == end { skip = 0; next }
    !skip { print }
    END { if (!changed) exit 2 }
  ' "$path" > "$path.tmp"
  mv "$path.tmp" "$path"
  if [ ! -s "$path" ]; then
    rm -f "$path"
    ok "removed $label file: $path"
  else
    ok "removed $label block: $path"
  fi
}

vault_path() {
  if [ -n "$BRAIN_DIR" ]; then
    case "$BRAIN_DIR" in
      "~/"*) printf '%s/%s\n' "$HOME" "${BRAIN_DIR#~/}" ;;
      *) printf '%s\n' "$BRAIN_DIR" ;;
    esac
  else
    printf '%s/brain\n' "$HOME"
  fi
}

purge_vault() {
  vault="$(vault_path)"
  if [ ! -d "$vault" ]; then
    info "vault not found: $vault"
    return
  fi
  if [ "${BRAIN_UNINSTALL_CONFIRM:-}" = "DELETE" ]; then
    confirm="DELETE"
  elif [ "$YES" -eq 1 ]; then
    confirm="DELETE"
  elif [ -t 0 ]; then
    printf 'Type DELETE to permanently remove vault %s: ' "$vault"
    if ! read confirm; then
      confirm=""
    fi
  else
    warn "vault purge requested, but stdin is not interactive"
    warn "re-run with --purge-vault --yes after explicit user approval"
    return
  fi
  if [ "$confirm" != "DELETE" ]; then
    warn "kept vault: $vault"
    return
  fi
  rm -rf "$vault"
  ok "removed vault: $vault"
}

echo ""
echo "HBrain uninstaller"
echo "---------------------------------------"

if [ "$REMOVE_CURSOR" -eq 1 ]; then
  remove_owned_file ".cursor/rules/brain.mdc" "Cursor rule"
  rmdir ".cursor/rules" ".cursor" 2>/dev/null || true
fi

if [ "$REMOVE_CLAUDE" -eq 1 ]; then
  remove_owned_file "$HOME/.claude/skills/brain.md" "Claude skill"
  remove_owned_file "$HOME/.claude/skills/brain/SKILL.md" "Claude skill"
  rmdir "$HOME/.claude/skills/brain" 2>/dev/null || true
fi

if [ "$REMOVE_WINDSURF" -eq 1 ]; then
  remove_owned_file ".windsurf/rules/brain.md" "Windsurf rule"
  remove_owned_file ".windsurf/rules/brain.mdc" "Windsurf rule"
  rmdir ".windsurf/rules" ".windsurf" 2>/dev/null || true
fi

if [ "$REMOVE_CODEX" -eq 1 ]; then
  remove_managed_block "AGENTS.md" "OpenAI Codex instructions"
fi

if command -v go >/dev/null 2>&1; then
  gobin="$(go env GOBIN 2>/dev/null || true)"
  gopath="$(go env GOPATH 2>/dev/null || true)"
  if [ -n "$gobin" ]; then
    remove_cli_at "$gobin/brain"
  fi
  if [ -n "$gopath" ]; then
    remove_cli_at "$gopath/bin/brain"
  fi
fi

if command -v brain >/dev/null 2>&1; then
  found="$(command -v brain)"
  warn "brain is still on PATH at: $found"
  warn "If this is not a local checkout binary, remove it manually."
else
  ok "brain CLI no longer found on PATH"
fi

if [ "$PURGE_VAULT" -eq 1 ]; then
  purge_vault
else
  info "vault kept. Re-run with --purge-vault to delete user data."
fi

echo ""
ok "uninstall complete"
