package skill

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestParse(t *testing.T) {
	input := `---
name: test-skill
description: A test skill
version: 2.0.0
author: Tester
event_types: [note, task, custom]
task_statuses: [open, done]
vault_path: ~/brain/skills/test-skill/vault
triggers:
  - test
  - /test
  - run a test
---

# test-skill

Body content here.
`
	sk, err := Parse(strings.NewReader(input), "test.md")
	if err != nil {
		t.Fatal(err)
	}
	if sk.Name != "test-skill" {
		t.Errorf("name = %q, want %q", sk.Name, "test-skill")
	}
	if sk.Description != "A test skill" {
		t.Errorf("description = %q, want %q", sk.Description, "A test skill")
	}
	if sk.Version != "2.0.0" {
		t.Errorf("version = %q, want %q", sk.Version, "2.0.0")
	}
	if sk.Author != "Tester" {
		t.Errorf("author = %q, want %q", sk.Author, "Tester")
	}
	if len(sk.EventTypes) != 3 || sk.EventTypes[2] != "custom" {
		t.Errorf("event_types = %v, want [note task custom]", sk.EventTypes)
	}
	if len(sk.TaskStatuses) != 2 {
		t.Errorf("task_statuses = %v, want [open done]", sk.TaskStatuses)
	}
	if sk.VaultPath != "~/brain/skills/test-skill/vault" {
		t.Errorf("vault_path = %q", sk.VaultPath)
	}
	if len(sk.Triggers) != 3 || sk.Triggers[0] != "test" {
		t.Errorf("triggers = %v, want [test /test run a test]", sk.Triggers)
	}
	if !strings.Contains(sk.Body, "Body content here.") {
		t.Errorf("body missing expected content")
	}
}

func TestParseMultilineDescription(t *testing.T) {
	input := `---
name: multi
description: |
  Line one of description
  Line two of description
version: 1.0.0
event_types: [note]
---

Body.
`
	sk, err := Parse(strings.NewReader(input), "test.md")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(sk.Description, "Line one") || !strings.Contains(sk.Description, "Line two") {
		t.Errorf("multiline description = %q", sk.Description)
	}
}

func TestSanitizeName(t *testing.T) {
	tests := []struct {
		input, want string
	}{
		{"Meeting Notes", "meeting-notes"},
		{"my_skill", "my-skill"},
		{"LOUD SKILL", "loud-skill"},
		{"skill!@#name", "skillname"},
		{"--trimmed--", "trimmed"},
		{"simple", "simple"},
	}
	for _, tt := range tests {
		got := sanitizeName(tt.input)
		if got != tt.want {
			t.Errorf("sanitizeName(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestStoreCreateAndGet(t *testing.T) {
	tmp := t.TempDir()
	store := NewStore(tmp)

	sk, err := store.Create("test-skill", "A test", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	if sk.Name != "test-skill" {
		t.Errorf("name = %q", sk.Name)
	}

	got, err := store.Get("test-skill")
	if err != nil {
		t.Fatal(err)
	}
	if got.Name != "test-skill" {
		t.Errorf("get name = %q", got.Name)
	}
	if got.Description != "A test" {
		t.Errorf("get description = %q, want %q", got.Description, "A test")
	}

	vaultDir := filepath.Join(store.Root, "test-skill", "vault", "events")
	if _, err := os.Stat(vaultDir); err != nil {
		t.Errorf("vault/events dir not created: %v", err)
	}
}

func TestStoreCreateDuplicate(t *testing.T) {
	tmp := t.TempDir()
	store := NewStore(tmp)

	if _, err := store.Create("dupe", "", nil, nil); err != nil {
		t.Fatal(err)
	}
	if _, err := store.Create("dupe", "", nil, nil); err == nil {
		t.Error("expected error for duplicate, got nil")
	}
}

func TestStoreListEmpty(t *testing.T) {
	tmp := t.TempDir()
	store := NewStore(tmp)

	skills, err := store.List()
	if err != nil {
		t.Fatal(err)
	}
	if len(skills) != 0 {
		t.Errorf("expected empty list, got %d", len(skills))
	}
}

func TestStoreList(t *testing.T) {
	tmp := t.TempDir()
	store := NewStore(tmp)

	store.Create("alpha", "First", nil, nil)
	store.Create("beta", "Second", nil, nil)

	skills, err := store.List()
	if err != nil {
		t.Fatal(err)
	}
	if len(skills) != 2 {
		t.Errorf("expected 2 skills, got %d", len(skills))
	}
}

func TestStoreExists(t *testing.T) {
	tmp := t.TempDir()
	store := NewStore(tmp)

	store.Create("exists", "", nil, nil)
	if !store.Exists("exists") {
		t.Error("expected Exists=true")
	}
	if store.Exists("nope") {
		t.Error("expected Exists=false")
	}
}
