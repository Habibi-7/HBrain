#!/usr/bin/env sh
set -e

REPO_OWNER="Habibi-7"
REPO_NAME="living-brain"
REPO_REF="main"
REPO_RAW="https://raw.githubusercontent.com/$REPO_OWNER/$REPO_NAME/$REPO_REF"
REPO_API="/repos/$REPO_OWNER/$REPO_NAME/contents"
SKILL_INSTALLED=0
INSTALL_CLI=1
MANAGED_BEGIN="<!-- BEGIN LIVING SECOND BRAIN -->"
MANAGED_END="<!-- END LIVING SECOND BRAIN -->"

# ── helpers ──────────────────────────────────────────────────────────────────

info()    { printf '  \033[34m%s\033[0m\n' "$*"; }
ok()      { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn()    { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()     { printf '\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }

# fetch <repo-path> <local-dest>
# Priority: gh api (authed) > curl+GH_TOKEN > curl raw (public only)
fetch() {
  fetch_path="$1"; fetch_dest="$2"
  mkdir -p "$(dirname "$fetch_dest")"

  if [ -f "$fetch_path" ]; then
    cp "$fetch_path" "$fetch_dest"
  elif command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    gh api -H "Accept: application/vnd.github.v3.raw" "$REPO_API/$fetch_path?ref=$REPO_REF" > "$fetch_dest"
  elif command -v curl >/dev/null 2>&1; then
    if [ -n "$GH_TOKEN" ]; then
      curl -fsSL -H "Authorization: token $GH_TOKEN" "$REPO_RAW/$fetch_path" -o "$fetch_dest"
    else
      curl -fsSL "$REPO_RAW/$fetch_path" -o "$fetch_dest"
    fi
  elif command -v wget >/dev/null 2>&1; then
    if [ -n "$GH_TOKEN" ]; then
      wget -qO "$fetch_dest" --header="Authorization: token $GH_TOKEN" "$REPO_RAW/$fetch_path"
    else
      wget -qO "$fetch_dest" "$REPO_RAW/$fetch_path"
    fi
  else
    die "gh, curl, or wget required"
  fi
}

strip_skill_frontmatter() {
  awk '
    BEGIN { marks = 0 }
    /^---[[:space:]]*$/ && marks < 2 { marks++; next }
    marks >= 2 { print }
  ' "$1"
}

write_platform_skill() {
  platform_name="$1"; agent_name="$2"; output_path="$3"
  skill_tmp="${TMPDIR:-/tmp}/brain-skill-$$.md"
  fetch "skill/SKILL.md" "$skill_tmp"
  mkdir -p "$(dirname "$output_path")"

  case "$platform_name" in
    cursor)
      {
        printf '%s\n' '---'
        printf '%s\n' 'description: Living Second Brain — semantic memory, retrieval, and HTML artifacts'
        printf '%s\n' 'alwaysApply: true'
        printf '%s\n\n' '---'
        strip_skill_frontmatter "$skill_tmp" | sed "s/agent: <agent-name>/agent: $agent_name/g"
      } > "$output_path"
      ;;
    windsurf)
      {
        printf '%s\n' '---'
        printf '%s\n' 'description: Living Second Brain — semantic memory, retrieval, and HTML artifacts'
        printf '%s\n' 'alwaysApply: true'
        printf '%s\n\n' '---'
        strip_skill_frontmatter "$skill_tmp" | sed "s/agent: <agent-name>/agent: $agent_name/g"
      } > "$output_path"
      ;;
    *)
      die "unknown platform generator: $platform_name"
      ;;
  esac

  rm -f "$skill_tmp"
}

remove_managed_block() {
  managed_path="$1"
  [ -f "$managed_path" ] || return 0
  awk -v begin="$MANAGED_BEGIN" -v end="$MANAGED_END" '
    $0 == begin { skip = 1; next }
    $0 == end { skip = 0; next }
    !skip { print }
  ' "$managed_path" > "$managed_path.tmp"
  mv "$managed_path.tmp" "$managed_path"
}

append_managed_skill() {
  managed_path="$1"; agent_name="$2"
  skill_tmp="${TMPDIR:-/tmp}/brain-skill-$$.md"
  fetch "skill/SKILL.md" "$skill_tmp"
  mkdir -p "$(dirname "$managed_path")"
  touch "$managed_path"
  remove_managed_block "$managed_path"
  {
    [ -s "$managed_path" ] && printf '\n'
    printf '%s\n' "$MANAGED_BEGIN"
    printf '%s\n' ''
    strip_skill_frontmatter "$skill_tmp" | sed "s/agent: <agent-name>/agent: $agent_name/g"
    printf '%s\n' ''
    printf '%s\n' "$MANAGED_END"
  } >> "$managed_path"
  rm -f "$skill_tmp"
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
  write_platform_skill cursor cursor "$dest"
  ok "Cursor       →  $dest"
  SKILL_INSTALLED=1
}

install_windsurf() {
  dest="${1:-.}/.windsurf/rules/brain.md"
  write_platform_skill windsurf windsurf "$dest"
  ok "Windsurf     →  $dest"
  SKILL_INSTALLED=1
}

install_codex() {
  dest="${1:-.}/AGENTS.md"
  append_managed_skill "$dest" codex
  ok "OpenAI Codex →  $dest"
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
    --codex)     PLATFORM=codex ;;
    --claude)    PLATFORM=claude ;;
    --no-cli|--skill-only) INSTALL_CLI=0 ;;
  esac
done

if [ -n "$PLATFORM" ]; then
  # Explicit platform
  case "$PLATFORM" in
    cursor)   install_cursor ;;
    windsurf) install_windsurf ;;
    codex)    install_codex ;;
    claude)   install_claude_code ;;
  esac
else
  # Auto-detect all present platforms
  info "Detecting agent platforms..."

  [ -d "$HOME/.claude" ]         && install_claude_code
  [ -d ".cursor" ]               && install_cursor .
  [ -d ".windsurf" ]             && install_windsurf .
  [ -f "AGENTS.md" ]             && install_codex .

  if [ "$SKILL_INSTALLED" -eq 0 ]; then
    warn "No agent platform detected in current directory or home."
    warn "Pass a flag to install manually:"
    warn "  --claude    →  ~/.claude/skills/brain.md"
    warn "  --cursor    →  .cursor/rules/brain.mdc"
    warn "  --windsurf  →  .windsurf/rules/brain.mdc"
    warn "  --codex     →  AGENTS.md"
    warn "  --no-cli    →  install only the skill/rule, skip optional CLI"
  fi
fi

if [ "$INSTALL_CLI" -eq 1 ]; then
  install_brain_cli
else
  info "Skipping optional brain CLI (--no-cli)"
fi

echo ""
[ "$SKILL_INSTALLED" -eq 1 ] && ok "Done. Set BRAIN_DIR=~/brain or let the agent ask on first use." \
                              || warn "Skill not installed. Re-run with a --platform flag."
echo ""
