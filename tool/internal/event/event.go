package event

import (
	"fmt"
	"io"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/Habibi-7/hbrain/tool/internal/frontmatter"
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
	Due       *time.Time
	Source    string
	Agent     string
	Tags      []string
	Links     []string
	Status    Status
	Body      string
	FilePath  string
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
	meta, body, err := frontmatter.Parse(r)
	if err != nil {
		return nil, err
	}

	ev := &Event{FilePath: filePath, Schema: 1, Body: body}
	for key, val := range meta {
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
			t, err := parseTimestamp(val)
			if err != nil {
				return nil, fmt.Errorf("frontmatter: bad created_at: %s", val)
			}
			ev.CreatedAt = t
		case "due":
			t, err := parseDue(val)
			if err != nil {
				return nil, fmt.Errorf("frontmatter: bad due: %s", val)
			}
			ev.Due = &t
		case "source":
			ev.Source = val
		case "agent":
			ev.Agent = val
		case "status":
			ev.Status = Status(val)
		case "tags":
			ev.Tags = frontmatter.ParseInlineList(val)
		case "links":
			ev.Links = frontmatter.ParseInlineList(val)
		}
	}
	return ev, nil
}

func ParseFile(path string) (*Event, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return Parse(f, path)
}

func parseTimestamp(val string) (time.Time, error) {
	if t, err := time.Parse(time.RFC3339, val); err == nil {
		return t, nil
	}
	return time.Parse("2006-01-02T15:04:05Z", val)
}

// parseDue accepts ISO 8601 date (2026-05-25) or full RFC3339 timestamp.
func parseDue(val string) (time.Time, error) {
	if t, err := time.Parse("2006-01-02", val); err == nil {
		return t, nil
	}
	return parseTimestamp(val)
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
