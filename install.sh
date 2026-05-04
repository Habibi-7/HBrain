#!/usr/bin/env sh
set -e

REPO="https://raw.githubusercontent.com/Habibi-7/living-brain/main"
SKILL_INSTALLED=0

# ── helpers ──────────────────────────────────────────────────────────────────

info()    { printf '  \033[34m%s\033[0m\n' "$*"; }
ok()      { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn()    { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()     { printf '\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }

fetch() {
  url="$1"; dest="$2"
  mkdir -p "$(dirname "$dest")"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$dest"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$dest" "$url"
  else
    die "curl or wget required"
  fi
}

# ── skill install ─────────────────────────────────────────────────────────────

install_claude_code() {
  dest="$HOME/.claude/skills/brain.md"
  fetch "$REPO/skill/SKILL.md" "$dest"
  ok "Claude Code  →  $dest"
  SKILL_INSTALLED=1
}

install_cursor() {
  dest="${1:-.}/.cursor/rules/brain.mdc"
  fetch "$REPO/platforms/cursor.mdc" "$dest"
  ok "Cursor       →  $dest"
  SKILL_INSTALLED=1
}

install_windsurf() {
  dest="${1:-.}/.windsurf/rules/brain.md"
  fetch "$REPO/platforms/windsurf.md" "$dest"
  ok "Windsurf     →  $dest"
  SKILL_INSTALLED=1
}

install_copilot() {
  dest="${1:-.}/.github/copilot-instructions.md"
  fetch "$REPO/platforms/copilot.md" "$dest"
  ok "Copilot      →  $dest"
  SKILL_INSTALLED=1
}

# ── brain CLI install ─────────────────────────────────────────────────────────

install_brain_cli() {
  if ! command -v go >/dev/null 2>&1; then
    warn "Go not found — skipping brain CLI install"
    warn "Install Go from https://go.dev/dl/ then run:"
    warn "  GOPRIVATE=github.com/Habibi-7/* go install github.com/Habibi-7/living-brain/tool/cmd/brain@main"
    return
  fi
  info "Installing brain CLI..."
  GOPRIVATE="github.com/Habibi-7/*" GONOSUMDB="github.com/Habibi-7/*" \
    go install github.com/Habibi-7/living-brain/tool/cmd/brain@main
  ok "brain CLI    →  $(go env GOPATH)/bin/brain"
}

# ── auto-detect ───────────────────────────────────────────────────────────────

echo ""
echo "brain — Living Second Brain installer"
echo "──────────────────────────────────────"

# Check for explicit --platform flag
PLATFORM=""
for arg in "$@"; do
  case "$arg" in
    --cursor)    PLATFORM=cursor ;;
    --windsurf)  PLATFORM=windsurf ;;
    --copilot)   PLATFORM=copilot ;;
    --claude)    PLATFORM=claude ;;
  esac
done

if [ -n "$PLATFORM" ]; then
  # Explicit platform
  case "$PLATFORM" in
    cursor)   install_cursor ;;
    windsurf) install_windsurf ;;
    copilot)  install_copilot ;;
    claude)   install_claude_code ;;
  esac
else
  # Auto-detect all present platforms
  info "Detecting agent platforms..."

  [ -d "$HOME/.claude" ]         && install_claude_code
  [ -d ".cursor" ]               && install_cursor .
  [ -d ".windsurf" ]             && install_windsurf .
  [ -d ".github" ] && grep -q "copilot" ".github/copilot-instructions.md" 2>/dev/null \
                               || [ -f ".github/copilot-instructions.md" ] \
                               && install_copilot .

  if [ "$SKILL_INSTALLED" -eq 0 ]; then
    warn "No agent platform detected in current directory or home."
    warn "Pass a flag to install manually:"
    warn "  --claude    →  ~/.claude/skills/brain.md"
    warn "  --cursor    →  .cursor/rules/brain.mdc"
    warn "  --windsurf  →  .windsurf/rules/brain.mdc"
    warn "  --copilot   →  .github/copilot-instructions.md"
  fi
fi

install_brain_cli

echo ""
[ "$SKILL_INSTALLED" -eq 1 ] && ok "Done. Set BRAIN_DIR=~/brain or let the agent ask on first use." \
                              || warn "Skill not installed. Re-run with a --platform flag."
echo ""
