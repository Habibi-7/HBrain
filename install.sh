#!/usr/bin/env sh
set -e

REPO_OWNER="Habibi-7"
REPO_NAME="living-brain"
REPO_REF="main"
REPO_RAW="https://raw.githubusercontent.com/$REPO_OWNER/$REPO_NAME/$REPO_REF"
REPO_API="/repos/$REPO_OWNER/$REPO_NAME/contents"
SKILL_INSTALLED=0

# ── helpers ──────────────────────────────────────────────────────────────────

info()    { printf '  \033[34m%s\033[0m\n' "$*"; }
ok()      { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn()    { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()     { printf '\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }

# fetch <repo-path> <local-dest>
# Priority: gh api (authed) > curl+GH_TOKEN > curl raw (public only)
fetch() {
  path="$1"; dest="$2"
  mkdir -p "$(dirname "$dest")"

  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    gh api -H "Accept: application/vnd.github.v3.raw" "$REPO_API/$path?ref=$REPO_REF" > "$dest"
  elif command -v curl >/dev/null 2>&1; then
    if [ -n "$GH_TOKEN" ]; then
      curl -fsSL -H "Authorization: token $GH_TOKEN" "$REPO_RAW/$path" -o "$dest"
    else
      curl -fsSL "$REPO_RAW/$path" -o "$dest"
    fi
  elif command -v wget >/dev/null 2>&1; then
    if [ -n "$GH_TOKEN" ]; then
      wget -qO "$dest" --header="Authorization: token $GH_TOKEN" "$REPO_RAW/$path"
    else
      wget -qO "$dest" "$REPO_RAW/$path"
    fi
  else
    die "gh, curl, or wget required"
  fi
}

# ── skill install ─────────────────────────────────────────────────────────────

install_claude_code() {
  dest="$HOME/.claude/skills/brain.md"
  fetch "skill/SKILL.md" "$dest"
  ok "Claude Code  →  $dest"
  SKILL_INSTALLED=1
}

install_cursor() {
  dest="${1:-.}/.cursor/rules/brain.mdc"
  fetch "platforms/cursor.mdc" "$dest"
  ok "Cursor       →  $dest"
  SKILL_INSTALLED=1
}

install_windsurf() {
  dest="${1:-.}/.windsurf/rules/brain.md"
  fetch "platforms/windsurf.md" "$dest"
  ok "Windsurf     →  $dest"
  SKILL_INSTALLED=1
}

install_copilot() {
  dest="${1:-.}/.github/copilot-instructions.md"
  fetch "platforms/copilot.md" "$dest"
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
