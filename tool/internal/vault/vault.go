package vault

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/Habibi-7/LSB/tool/internal/event"
)

type Vault struct {
	Root string
}

// Discover finds the vault directory.
// Priority: $BRAIN_DIR > ~/brain > error.
func Discover() (*Vault, error) {
	if dir := os.Getenv("BRAIN_DIR"); dir != "" {
		dir = expandHome(dir)
		if isVault(dir) {
			return &Vault{Root: dir}, nil
		}
		return nil, fmt.Errorf("BRAIN_DIR=%s exists but has no events/ directory", dir)
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}

	defaultDir := filepath.Join(home, "brain")
	if isVault(defaultDir) {
		return &Vault{Root: defaultDir}, nil
	}

	return nil, fmt.Errorf("no vault found. Set BRAIN_DIR or create ~/brain/events/")
}

func isVault(dir string) bool {
	info, err := os.Stat(filepath.Join(dir, "events"))
	return err == nil && info.IsDir()
}

func expandHome(path string) string {
	if strings.HasPrefix(path, "~/") {
		home, err := os.UserHomeDir()
		if err != nil {
			return path
		}
		return filepath.Join(home, path[2:])
	}
	return path
}

// EventsDir returns the path to the events directory.
func (v *Vault) EventsDir() string {
	return filepath.Join(v.Root, "events")
}

// TemplatesDir returns the path to templates.
func (v *Vault) TemplatesDir() string {
	return filepath.Join(v.Root, ".brain", "templates")
}

// AllEvents walks the events directory and parses every .md file.
func (v *Vault) AllEvents() ([]*event.Event, error) {
	var events []*event.Event
	var parseErrors []string

	err := filepath.Walk(v.EventsDir(), func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // skip unreadable
		}
		if info.IsDir() || !strings.HasSuffix(info.Name(), ".md") {
			return nil
		}
		ev, err := event.ParseFile(path)
		if err != nil {
			parseErrors = append(parseErrors, fmt.Sprintf("%s: %v", path, err))
			return nil
		}
		events = append(events, ev)
		return nil
	})

	if err != nil {
		return nil, err
	}

	if len(events) == 0 && len(parseErrors) > 0 {
		return nil, fmt.Errorf("no valid events found. Parse errors:\n%s", strings.Join(parseErrors, "\n"))
	}

	return events, nil
}
