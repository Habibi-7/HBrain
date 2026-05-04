package event

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"sort"
	"strings"
	"time"
)

type Type string

const (
	Note     Type = "note"
	Task     Type = "task"
	Decision Type = "decision"
	Fact     Type = "fact"
	Link     Type = "link"
)

type Status string

const (
	Open      Status = "open"
	Done      Status = "done"
	Blocked   Status = "blocked"
	Cancelled Status = "cancelled"
)

type Event struct {
	ID        string
	Schema    int
	Type      Type
	CreatedAt time.Time
	Source    string
	Agent    string
	Tags     []string
	Links    []string
	Status   Status
	Body     string
	FilePath string
}

func (e *Event) Title() string {
	body := strings.TrimSpace(e.Body)
	if body == "" {
		return "(empty)"
	}
	first := strings.SplitN(body, "\n", 2)[0]
	if len(first) > 120 {
		return first[:117] + "..."
	}
	return first
}

func Parse(r io.Reader, filePath string) (*Event, error) {
	scanner := bufio.NewScanner(r)

	// Expect opening ---
	if !scanner.Scan() || strings.TrimSpace(scanner.Text()) != "---" {
		return nil, fmt.Errorf("missing frontmatter opening")
	}

	// Read frontmatter lines until closing ---
	var fmLines []string
	for scanner.Scan() {
		line := scanner.Text()
		if strings.TrimSpace(line) == "---" {
			break
		}
		fmLines = append(fmLines, line)
	}

	ev := &Event{FilePath: filePath, Schema: 1}
	if err := parseFrontmatter(fmLines, ev); err != nil {
		return nil, fmt.Errorf("frontmatter: %w", err)
	}

	// Rest is body
	var bodyLines []string
	for scanner.Scan() {
		bodyLines = append(bodyLines, scanner.Text())
	}
	ev.Body = strings.Join(bodyLines, "\n")

	return ev, scanner.Err()
}

func ParseFile(path string) (*Event, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return Parse(f, path)
}

func parseFrontmatter(lines []string, ev *Event) error {
	for _, line := range lines {
		key, val, ok := splitKV(line)
		if !ok {
			continue
		}
		switch key {
		case "id":
			ev.ID = val
		case "schema":
			if val == "1" {
				ev.Schema = 1
			}
		case "type":
			ev.Type = Type(val)
		case "created_at":
			t, err := time.Parse(time.RFC3339, val)
			if err != nil {
				t, err = time.Parse("2006-01-02T15:04:05Z", val)
				if err != nil {
					return fmt.Errorf("bad created_at: %s", val)
				}
			}
			ev.CreatedAt = t
		case "source":
			ev.Source = val
		case "agent":
			ev.Agent = val
		case "status":
			ev.Status = Status(val)
		case "tags":
			ev.Tags = parseYAMLList(val)
		case "links":
			ev.Links = parseYAMLList(val)
		}
	}
	return nil
}

func splitKV(line string) (string, string, bool) {
	idx := strings.Index(line, ":")
	if idx < 0 {
		return "", "", false
	}
	key := strings.TrimSpace(line[:idx])
	val := strings.TrimSpace(line[idx+1:])
	return key, val, true
}

// parseYAMLList handles inline YAML lists: [foo, bar, baz]
func parseYAMLList(val string) []string {
	val = strings.TrimSpace(val)
	if val == "[]" || val == "" {
		return nil
	}
	val = strings.TrimPrefix(val, "[")
	val = strings.TrimSuffix(val, "]")
	parts := strings.Split(val, ",")
	var result []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}

// SortByTime sorts events newest first.
func SortByTime(events []*Event) {
	sort.Slice(events, func(i, j int) bool {
		return events[i].CreatedAt.After(events[j].CreatedAt)
	})
}

// SortByTimeAsc sorts events oldest first.
func SortByTimeAsc(events []*Event) {
	sort.Slice(events, func(i, j int) bool {
		return events[i].CreatedAt.Before(events[j].CreatedAt)
	})
}
