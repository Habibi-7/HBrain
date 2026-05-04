package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"

	"github.com/Habibi-7/living-brain/tool/internal/vault"
	"github.com/Habibi-7/living-brain/tool/internal/view"
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

func usage() {
	fmt.Fprintf(os.Stderr, `brain — Living Second Brain CLI

Usage: brain <command> [args]

Commands:
  timeline [days]      Open HTML timeline (default: 7 days)
  tasks [status|all]   List tasks (default: open, "all" for every status)
  search <query>       Search events by content or tag
  stale [days]         Find stale open/blocked tasks (default: 14 days)
  stats                Vault overview: counts, types, top tags
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
