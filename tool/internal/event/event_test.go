package event

import (
	"strings"
	"testing"
	"time"
)

func TestParseTask(t *testing.T) {
	input := `---
id: 01HXYZ
schema: 1
type: task
created_at: 2026-05-20T10:00:00Z
status: open
tags: [work, urgent]
---

Ship the thing.
`
	ev, err := Parse(strings.NewReader(input), "test.md")
	if err != nil {
		t.Fatal(err)
	}
	if ev.ID != "01HXYZ" {
		t.Errorf("id = %q", ev.ID)
	}
	if ev.Type != Task {
		t.Errorf("type = %q", ev.Type)
	}
	if ev.Status != Open {
		t.Errorf("status = %q", ev.Status)
	}
	if len(ev.Tags) != 2 || ev.Tags[0] != "work" || ev.Tags[1] != "urgent" {
		t.Errorf("tags = %v", ev.Tags)
	}
	if !strings.Contains(ev.Body, "Ship the thing.") {
		t.Errorf("body = %q", ev.Body)
	}
}

func TestParseTaskWithDueDate(t *testing.T) {
	input := `---
id: 01HXYZ
type: task
created_at: 2026-05-20T10:00:00Z
due: 2026-06-01
status: open
---

Pay the rent.
`
	ev, err := Parse(strings.NewReader(input), "test.md")
	if err != nil {
		t.Fatal(err)
	}
	if ev.Due == nil {
		t.Fatal("Due is nil")
	}
	want := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	if !ev.Due.Equal(want) {
		t.Errorf("Due = %v, want %v", ev.Due, want)
	}
}

func TestParseTaskWithDueTimestamp(t *testing.T) {
	input := `---
id: 01HXYZ
type: task
created_at: 2026-05-20T10:00:00Z
due: 2026-06-01T15:30:00Z
---

Submit form.
`
	ev, err := Parse(strings.NewReader(input), "test.md")
	if err != nil {
		t.Fatal(err)
	}
	if ev.Due == nil {
		t.Fatal("Due is nil")
	}
	want := time.Date(2026, 6, 1, 15, 30, 0, 0, time.UTC)
	if !ev.Due.Equal(want) {
		t.Errorf("Due = %v, want %v", ev.Due, want)
	}
}

func TestParseTaskWithoutDue(t *testing.T) {
	input := `---
id: 01HXYZ
type: task
created_at: 2026-05-20T10:00:00Z
status: open
---

No due date.
`
	ev, err := Parse(strings.NewReader(input), "test.md")
	if err != nil {
		t.Fatal(err)
	}
	if ev.Due != nil {
		t.Errorf("Due should be nil, got %v", ev.Due)
	}
}

func TestParseBadDue(t *testing.T) {
	input := `---
id: 01HXYZ
type: task
created_at: 2026-05-20T10:00:00Z
due: not-a-date
---

Body.
`
	if _, err := Parse(strings.NewReader(input), "test.md"); err == nil {
		t.Error("expected error for bad due date")
	}
}

func TestParseMissingOpening(t *testing.T) {
	if _, err := Parse(strings.NewReader("no frontmatter"), "test.md"); err == nil {
		t.Error("expected error for missing opening")
	}
}
