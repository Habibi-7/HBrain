package frontmatter

import (
	"strings"
	"testing"
)

func TestParseSimpleScalars(t *testing.T) {
	input := `---
id: 01HXYZ
type: task
status: open
---

Body line one.
Body line two.
`
	meta, body, err := Parse(strings.NewReader(input))
	if err != nil {
		t.Fatal(err)
	}
	if meta["id"] != "01HXYZ" {
		t.Errorf("id = %q", meta["id"])
	}
	if meta["type"] != "task" {
		t.Errorf("type = %q", meta["type"])
	}
	if meta["status"] != "open" {
		t.Errorf("status = %q", meta["status"])
	}
	if !strings.Contains(body, "Body line one.") {
		t.Errorf("body missing line one: %q", body)
	}
}

func TestParseInlineList(t *testing.T) {
	got := ParseInlineList("[note, task, decision]")
	want := []string{"note", "task", "decision"}
	if len(got) != len(want) {
		t.Fatalf("got %v, want %v", got, want)
	}
	for i := range got {
		if got[i] != want[i] {
			t.Errorf("[%d] = %q, want %q", i, got[i], want[i])
		}
	}
}

func TestParseInlineListEmpty(t *testing.T) {
	if got := ParseInlineList("[]"); got != nil {
		t.Errorf("expected nil, got %v", got)
	}
	if got := ParseInlineList(""); got != nil {
		t.Errorf("expected nil, got %v", got)
	}
}

func TestParseMultilineScalar(t *testing.T) {
	input := `---
description: |
  Line one
  Line two
version: 1.0.0
---

Body.
`
	meta, _, err := Parse(strings.NewReader(input))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(meta["description"], "Line one") {
		t.Errorf("description = %q", meta["description"])
	}
	if !strings.Contains(meta["description"], "Line two") {
		t.Errorf("description = %q", meta["description"])
	}
	if meta["version"] != "1.0.0" {
		t.Errorf("version = %q after multiline", meta["version"])
	}
}

func TestParseBlockList(t *testing.T) {
	input := `---
name: test
triggers:
  - test
  - /test
  - run a test
---

Body.
`
	meta, _, err := Parse(strings.NewReader(input))
	if err != nil {
		t.Fatal(err)
	}
	items := ParseBlockList(meta["triggers"])
	want := []string{"test", "/test", "run a test"}
	if len(items) != len(want) {
		t.Fatalf("got %v, want %v", items, want)
	}
	for i := range items {
		if items[i] != want[i] {
			t.Errorf("[%d] = %q, want %q", i, items[i], want[i])
		}
	}
}

func TestParseMissingOpening(t *testing.T) {
	if _, _, err := Parse(strings.NewReader("no frontmatter here")); err == nil {
		t.Error("expected error for missing opening ---")
	}
}
