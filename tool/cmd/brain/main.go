package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"github.com/Habibi-7/hbrain/tool/internal/skill"
	"github.com/Habibi-7/hbrain/tool/internal/vault"
	"github.com/Habibi-7/hbrain/tool/internal/view"
)

const version = "0.1.0"

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(1)
	}

	cmd := os.Args[1]

	switch cmd {
	case "version", "--version", "-v":
		fmt.Printf("brain %s\n", version)
		return
	case "help", "--help", "-h":
		usage()
		return
	case "skill":
		runSkill(os.Args[2:])
		return
	}

	v, err := vault.Discover()
	if err != nil {
		fatal(err)
	}

	switch cmd {
	case "timeline":
		days := intFlag(os.Args[2:], 7)
		tmp := tempHTML("timeline")
		f, err := os.Create(tmp)
		if err != nil {
			fatal(err)
		}
		if err := view.Timeline(f, v, days); err != nil {
			f.Close()
			fatal(err)
		}
		f.Close()
		openBrowser(tmp)
		fmt.Printf("Timeline (%d days) → %s\n", days, tmp)

	case "tasks":
		status := stringFlag(os.Args[2:], "open")
		if status == "all" {
			status = ""
		}
		if err := view.Tasks(os.Stdout, v, status); err != nil {
			fatal(err)
		}

	case "search":
		if len(os.Args) < 3 {
			fatal(fmt.Errorf("usage: brain search <query>"))
		}
		query := os.Args[2]
		if err := view.Search(os.Stdout, v, query); err != nil {
			fatal(err)
		}

	case "stale":
		days := intFlag(os.Args[2:], 14)
		if err := view.Stale(os.Stdout, v, days); err != nil {
			fatal(err)
		}

	case "stats":
		if err := view.Stats(os.Stdout, v); err != nil {
			fatal(err)
		}

	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n\n", cmd)
		usage()
		os.Exit(1)
	}
}

func runSkill(args []string) {
	if len(args) == 0 {
		skillUsage()
		os.Exit(1)
	}

	store, err := skill.DiscoverStore()
	if err != nil {
		fatal(err)
	}

	sub := args[0]
	switch sub {
	case "list", "ls":
		skills, err := store.List()
		if err != nil {
			fatal(err)
		}
		if len(skills) == 0 {
			fmt.Println("No skills found. Create one: brain skill create <name>")
			return
		}
		fmt.Printf("Skills (%d)\n\n", len(skills))
		for _, sk := range skills {
			desc := sk.Description
			if len(desc) > 60 {
				desc = desc[:57] + "..."
			}
			types := strings.Join(sk.EventTypes, ", ")
			fmt.Printf("  %-20s %s\n", sk.Name, desc)
			if types != "" {
				fmt.Printf("  %-20s types: %s\n", "", types)
			}
			fmt.Println()
		}

	case "show":
		if len(args) < 2 {
			fatal(fmt.Errorf("usage: brain skill show <name>"))
		}
		sk, err := store.Get(args[1])
		if err != nil {
			fatal(err)
		}
		fmt.Printf("Name:         %s\n", sk.Name)
		fmt.Printf("Description:  %s\n", sk.Description)
		fmt.Printf("Version:      %s\n", sk.Version)
		if sk.Author != "" {
			fmt.Printf("Author:       %s\n", sk.Author)
		}
		fmt.Printf("Event types:  %s\n", strings.Join(sk.EventTypes, ", "))
		if len(sk.TaskStatuses) > 0 {
			fmt.Printf("Statuses:     %s\n", strings.Join(sk.TaskStatuses, ", "))
		}
		if sk.VaultPath != "" {
			fmt.Printf("Vault:        %s\n", sk.VaultPath)
		}
		fmt.Printf("File:         %s\n", sk.FilePath)
		if len(sk.Triggers) > 0 {
			fmt.Printf("Triggers:     %s\n", strings.Join(sk.Triggers, ", "))
		}

	case "create":
		if len(args) < 2 {
			fatal(fmt.Errorf("usage: brain skill create <name> [description]"))
		}
		name := args[1]
		desc := ""
		if len(args) > 2 {
			desc = strings.Join(args[2:], " ")
		}
		sk, err := store.Create(name, desc, nil, nil)
		if err != nil {
			fatal(err)
		}
		fmt.Printf("✓ Skill created: %s\n", sk.Name)
		fmt.Printf("  %s\n", sk.FilePath)
		fmt.Printf("\n  Edit SKILL.md to customize event types, triggers, and capture rules.\n")

	case "path":
		if len(args) < 2 {
			fatal(fmt.Errorf("usage: brain skill path <name>"))
		}
		sk, err := store.Get(args[1])
		if err != nil {
			fatal(err)
		}
		fmt.Println(sk.FilePath)

	default:
		fmt.Fprintf(os.Stderr, "unknown skill command: %s\n\n", sub)
		skillUsage()
		os.Exit(1)
	}
}

func skillUsage() {
	fmt.Fprintf(os.Stderr, `Usage: brain skill <command> [args]

Commands:
  create <name> [desc]   Create a new skill with scaffolded SKILL.md
  list                   List all skills
  show <name>            Show skill details
  path <name>            Print path to SKILL.md

Skills live at $BRAIN_DIR/skills/ (default: ~/brain/skills/).
Each skill is a directory with a SKILL.md that defines capture rules,
event types, triggers, and workflows for a specific domain.
`)
}

func usage() {
	fmt.Fprintf(os.Stderr, `brain — HBrain CLI

Usage: brain <command> [args]

Commands:
  timeline [days]      Open HTML timeline (default: 7 days)
  tasks [status|all]   List tasks (default: open, "all" for every status)
  search <query>       Search events by content or tag
  stale [days]         Find stale open/blocked tasks (default: 14 days)
  stats                Vault overview: counts, types, top tags
  skill <sub>          Manage skills (create, list, show)
  version              Print version

Environment:
  BRAIN_DIR            Vault path (default: ~/brain)
`)
}

func intFlag(args []string, def int) int {
	if len(args) > 0 {
		if n, err := strconv.Atoi(args[0]); err == nil && n > 0 {
			return n
		}
	}
	return def
}

func stringFlag(args []string, def string) string {
	if len(args) > 0 && args[0] != "" {
		return args[0]
	}
	return def
}

func tempHTML(name string) string {
	return filepath.Join(os.TempDir(), fmt.Sprintf("brain-%s.html", name))
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "linux":
		cmd = exec.Command("xdg-open", url)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	default:
		return
	}
	cmd.Start()
}

func fatal(err error) {
	fmt.Fprintf(os.Stderr, "brain: %v\n", err)
	os.Exit(1)
}
