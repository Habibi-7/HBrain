#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const SKILL_PATH = path.join(PACKAGE_ROOT, "skill", "SKILL.md");
const TEMPLATE_DIR = path.join(PACKAGE_ROOT, "skill", "templates");
const MANAGED_BEGIN = "<!-- BEGIN HBRAIN -->";
const MANAGED_END = "<!-- END HBRAIN -->";
const LEGACY_MANAGED_BEGIN = "<!-- BEGIN LIVING SECOND BRAIN -->";
const LEGACY_MANAGED_END = "<!-- END LIVING SECOND BRAIN -->";

function main() {
  const [command = "help", ...args] = process.argv.slice(2);

  switch (command) {
    case "install":
      install(parseArgs(args));
      break;
    case "uninstall":
      uninstall(parseArgs(args));
      break;
    case "status":
      status();
      break;
    case "help":
    case "--help":
    case "-h":
      help();
      break;
    case "version":
    case "--version":
    case "-v":
      version();
      break;
    default:
      fail(`unknown command: ${command}\n\nRun: npx hbrain --help`);
  }
}

function parseArgs(args) {
  const options = {
    platforms: new Set(),
    vault: process.env.BRAIN_DIR || path.join(os.homedir(), "brain"),
    initVault: true,
    yes: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    switch (arg) {
      case "--cursor":
        options.platforms.add("cursor");
        break;
      case "--claude":
        options.platforms.add("claude");
        break;
      case "--codex":
        options.platforms.add("codex");
        break;
      case "--windsurf":
        options.platforms.add("windsurf");
        break;
      case "--all":
        ["cursor", "claude", "codex", "windsurf"].forEach((platform) =>
          options.platforms.add(platform),
        );
        break;
      case "--vault":
        index += 1;
        if (!args[index]) fail("--vault requires a path");
        options.vault = expandHome(args[index]);
        break;
      case "--no-vault":
        options.initVault = false;
        break;
      case "--yes":
      case "-y":
        options.yes = true;
        break;
      default:
        fail(`unknown option: ${arg}`);
    }
  }

  return options;
}

function install(options) {
  ensurePackageFiles();

  const platforms = getTargetPlatforms(options);
  if (platforms.length === 0) {
    fail(
      [
        "No supported agent platform detected.",
        "",
        "Choose one explicitly:",
        "  npx hbrain install --cursor",
        "  npx hbrain install --claude",
        "  npx hbrain install --codex",
        "  npx hbrain install --windsurf",
      ].join("\n"),
    );
  }

  for (const platform of platforms) {
    switch (platform) {
      case "cursor":
        installCursor();
        break;
      case "claude":
        installClaude();
        break;
      case "codex":
        installCodex();
        break;
      case "windsurf":
        installWindsurf();
        break;
      default:
        fail(`unsupported platform: ${platform}`);
    }
  }

  if (options.initVault) {
    initVault(options.vault);
  }

  ok("HBrain is ready.");
  info(`Vault: ${options.vault}`);
  info('Try: "show my week" or "what are my open tasks?"');
}

function uninstall(options) {
  const platforms = getTargetPlatforms(options);
  const targets = platforms.length > 0 ? platforms : ["cursor", "claude", "codex", "windsurf"];

  for (const platform of targets) {
    switch (platform) {
      case "cursor":
        removeOwnedFile(path.join(process.cwd(), ".cursor", "rules", "brain.mdc"), "Cursor rule");
        pruneEmptyDirs([
          path.join(process.cwd(), ".cursor", "rules"),
          path.join(process.cwd(), ".cursor"),
        ]);
        break;
      case "claude":
        removeOwnedFile(path.join(os.homedir(), ".claude", "skills", "brain.md"), "Claude skill");
        removeOwnedFile(
          path.join(os.homedir(), ".claude", "skills", "brain", "SKILL.md"),
          "Claude skill",
        );
        pruneEmptyDirs([path.join(os.homedir(), ".claude", "skills", "brain")]);
        break;
      case "codex":
        removeManagedBlock(path.join(process.cwd(), "AGENTS.md"), "OpenAI Codex instructions");
        break;
      case "windsurf":
        removeOwnedFile(path.join(process.cwd(), ".windsurf", "rules", "brain.md"), "Windsurf rule");
        removeOwnedFile(path.join(process.cwd(), ".windsurf", "rules", "brain.mdc"), "Windsurf rule");
        pruneEmptyDirs([
          path.join(process.cwd(), ".windsurf", "rules"),
          path.join(process.cwd(), ".windsurf"),
        ]);
        break;
      default:
        fail(`unsupported platform: ${platform}`);
    }
  }

  info("Vault kept. Delete it manually only if you want saved notes gone.");
  ok("Uninstall complete.");
}

function status() {
  const rows = [
    ["Cursor", path.join(process.cwd(), ".cursor", "rules", "brain.mdc")],
    ["Claude Code / Cowork", path.join(os.homedir(), ".claude", "skills", "brain.md")],
    ["OpenAI Codex", path.join(process.cwd(), "AGENTS.md")],
    ["Windsurf", path.join(process.cwd(), ".windsurf", "rules", "brain.md")],
  ];

  for (const [label, file] of rows) {
    const installed =
      label === "OpenAI Codex" ? hasManagedBlock(file) : looksOwned(file);
    console.log(`${installed ? "✓" : "·"} ${label}: ${file}`);
  }
}

function getTargetPlatforms(options) {
  if (options.platforms.size > 0) {
    return [...options.platforms];
  }

  const platforms = [];
  if (fs.existsSync(path.join(process.cwd(), ".cursor"))) platforms.push("cursor");
  if (fs.existsSync(path.join(os.homedir(), ".claude"))) platforms.push("claude");
  if (fs.existsSync(path.join(process.cwd(), "AGENTS.md"))) platforms.push("codex");
  if (fs.existsSync(path.join(process.cwd(), ".windsurf"))) platforms.push("windsurf");
  return platforms;
}

function installCursor() {
  const target = path.join(process.cwd(), ".cursor", "rules", "brain.mdc");
  const body = stripSkillFrontmatter(readSkill()).replaceAll("agent: <agent-name>", "agent: cursor");
  writeFile(
    target,
    [
      "---",
      "description: HBrain — semantic memory, retrieval, and HTML artifacts",
      "alwaysApply: true",
      "---",
      "",
      body,
    ].join("\n"),
  );
  ok(`Cursor → ${relative(target)}`);
}

function installClaude() {
  const target = path.join(os.homedir(), ".claude", "skills", "brain.md");
  writeFile(target, readSkill().replaceAll("agent: <agent-name>", "agent: claude-code"));
  ok(`Claude Code / Cowork → ${target}`);
}

function installCodex() {
  const target = path.join(process.cwd(), "AGENTS.md");
  const body = stripSkillFrontmatter(readSkill()).replaceAll("agent: <agent-name>", "agent: codex");
  appendManagedBlock(target, body);
  ok(`OpenAI Codex → ${relative(target)}`);
}

function installWindsurf() {
  const target = path.join(process.cwd(), ".windsurf", "rules", "brain.md");
  const body = stripSkillFrontmatter(readSkill()).replaceAll("agent: <agent-name>", "agent: windsurf");
  writeFile(
    target,
    [
      "---",
      "description: HBrain — semantic memory, retrieval, and HTML artifacts",
      "alwaysApply: true",
      "---",
      "",
      body,
    ].join("\n"),
  );
  ok(`Windsurf → ${relative(target)}`);
}

function initVault(vaultRoot) {
  const root = expandHome(vaultRoot);
  ensureDir(path.join(root, "events"));
  ensureDir(path.join(root, "renders"));
  ensureDir(path.join(root, ".brain", "templates"));

  if (fs.existsSync(TEMPLATE_DIR)) {
    for (const file of fs.readdirSync(TEMPLATE_DIR)) {
      const source = path.join(TEMPLATE_DIR, file);
      const dest = path.join(root, ".brain", "templates", file);
      if (fs.statSync(source).isFile() && !fs.existsSync(dest)) {
        fs.copyFileSync(source, dest);
      }
    }
  }

  ok(`Vault → ${root}`);
}

function appendManagedBlock(file, body) {
  ensureDir(path.dirname(file));
  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const cleaned = removeManagedBlockText(existing).trimEnd();
  const next = `${cleaned}${cleaned ? "\n\n" : ""}${MANAGED_BEGIN}\n\n${body.trim()}\n\n${MANAGED_END}\n`;
  fs.writeFileSync(file, next);
}

function removeManagedBlock(file, label) {
  if (!fs.existsSync(file)) {
    info(`${label} not found: ${relative(file)}`);
    return;
  }

  const existing = fs.readFileSync(file, "utf8");
  if (!hasManagedBlock(file)) {
    info(`${label} has no HBrain block: ${relative(file)}`);
    return;
  }

  const next = removeManagedBlockText(existing).trim();
  if (next) {
    fs.writeFileSync(file, `${next}\n`);
    ok(`Removed ${label} block → ${relative(file)}`);
  } else {
    fs.rmSync(file);
    ok(`Removed ${label} file → ${relative(file)}`);
  }
}

function removeManagedBlockText(text) {
  let begin = MANAGED_BEGIN;
  let endMarker = MANAGED_END;
  let start = text.indexOf(begin);
  if (start === -1) {
    begin = LEGACY_MANAGED_BEGIN;
    endMarker = LEGACY_MANAGED_END;
    start = text.indexOf(begin);
  }
  if (start === -1) return text;
  const end = text.indexOf(endMarker, start);
  if (end === -1) return text;
  return `${text.slice(0, start)}${text.slice(end + endMarker.length)}`;
}

function removeOwnedFile(file, label) {
  if (!fs.existsSync(file)) {
    info(`${label} not found: ${relative(file)}`);
    return;
  }
  if (!looksOwned(file)) {
    info(`${label} kept because it does not look like HBrain: ${relative(file)}`);
    return;
  }
  fs.rmSync(file);
  ok(`Removed ${label} → ${relative(file)}`);
}

function looksOwned(file) {
  if (!fs.existsSync(file)) return false;
  const content = fs.readFileSync(file, "utf8");
  return content.includes("HBrain") || content.includes("Living Second Brain");
}

function hasManagedBlock(file) {
  if (!fs.existsSync(file)) return false;
  const content = fs.readFileSync(file, "utf8");
  return content.includes(MANAGED_BEGIN) || content.includes(LEGACY_MANAGED_BEGIN);
}

function readSkill() {
  return fs.readFileSync(SKILL_PATH, "utf8");
}

function stripSkillFrontmatter(markdown) {
  const lines = markdown.split(/\r?\n/);
  if (lines[0] !== "---") return markdown;
  let end = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index] === "---") {
      end = index;
      break;
    }
  }
  return end === -1 ? markdown : lines.slice(end + 1).join("\n").trimStart();
}

function ensurePackageFiles() {
  if (!fs.existsSync(SKILL_PATH)) {
    fail(`package is missing ${path.relative(PACKAGE_ROOT, SKILL_PATH)}`);
  }
}

function writeFile(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content.endsWith("\n") ? content : `${content}\n`);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function pruneEmptyDirs(dirs) {
  for (const dir of dirs) {
    try {
      fs.rmdirSync(dir);
    } catch {
      // Directory is not empty or does not exist. That's fine.
    }
  }
}

function expandHome(value) {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return path.resolve(value);
}

function relative(file) {
  const rel = path.relative(process.cwd(), file);
  return rel && !rel.startsWith("..") ? rel : file;
}

function ok(message) {
  console.log(`✓ ${message}`);
}

function info(message) {
  console.log(`• ${message}`);
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function version() {
  const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8"));
  console.log(pkg.version);
}

function help() {
  console.log(`HBrain

Usage:
  npx hbrain install [platform] [options]
  npx hbrain uninstall [platform]
  npx hbrain status

Platforms:
  --cursor       Install .cursor/rules/brain.mdc
  --claude       Install ~/.claude/skills/brain.md
  --codex        Add a managed block to AGENTS.md
  --windsurf     Install .windsurf/rules/brain.md
  --all          Install all supported platform files

Options:
  --vault <path> Set up a vault path (default: $BRAIN_DIR or ~/brain)
  --no-vault     Skip vault directory/template setup
  --yes          Reserved for non-interactive future prompts

Examples:
  npx hbrain install --cursor
  npx hbrain install --codex --vault ~/brain
  npx hbrain uninstall --codex
`);
}

main();
