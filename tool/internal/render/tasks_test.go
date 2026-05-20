package render

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/Habibi-7/hbrain/tool/internal/event"
)

func sampleTaskEvents() []*event.Event {
	due := time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC)
	return []*event.Event{
		{
			Type:      event.Task,
			CreatedAt: time.Date(2026, 5, 18, 9, 0, 0, 0, time.UTC),
			Body:      "Ship HH-611",
			Status:    event.Open,
			Due:       &due,
		},
		{
			Type:      event.Task,
			CreatedAt: time.Date(2026, 5, 17, 9, 0, 0, 0, time.UTC),
			Body:      "Ship HH-610",
			Status:    event.Done,
		},
		{
			Type:      event.Task,
			CreatedAt: time.Date(2026, 5, 19, 9, 0, 0, 0, time.UTC),
			Body:      "Waiting on review",
			Status:    event.Blocked,
		},
		// Non-task should be ignored
		{
			Type:      event.Note,
			CreatedAt: time.Date(2026, 5, 19, 9, 0, 0, 0, time.UTC),
			Body:      "should not appear",
		},
	}
}

func TestBuildTaskBoardVM(t *testing.T) {
	vm := BuildTaskBoardVM(sampleTaskEvents(), "")

	if vm.TotalCount != 3 {
		t.Errorf("TotalCount = %d, want 3", vm.TotalCount)
	}
	if len(vm.Groups) != 3 {
		t.Errorf("Groups len = %d, want 3 (open/done/blocked)", len(vm.Groups))
	}

	// Status order: open, done, blocked, cancelled
	wantOrder := []string{"open", "done", "blocked"}
	for i, g := range vm.Groups {
		if g.Status != wantOrder[i] {
			t.Errorf("group[%d].Status = %q, want %q", i, g.Status, wantOrder[i])
		}
	}
}

func TestBuildTaskBoardVMStatusFilter(t *testing.T) {
	vm := BuildTaskBoardVM(sampleTaskEvents(), "open")

	if vm.TotalCount != 1 {
		t.Errorf("TotalCount = %d, want 1 (only open)", vm.TotalCount)
	}
	if len(vm.Groups) != 1 || vm.Groups[0].Status != "open" {
		t.Errorf("Groups = %v, want only open", vm.Groups)
	}
	if vm.Label != "Open tasks" {
		t.Errorf("Label = %q, want 'Open tasks'", vm.Label)
	}
}

func TestTaskBoardAsJSONEnvelopeShape(t *testing.T) {
	vm := BuildTaskBoardVM(sampleTaskEvents(), "")

	var buf bytes.Buffer
	if err := TaskBoardAsJSON(&buf, vm); err != nil {
		t.Fatal(err)
	}

	var got struct {
		Meta struct {
			Label string `json:"label"`
			Count int    `json:"count"`
		} `json:"meta"`
		Tasks []map[string]any `json:"tasks"`
	}
	if err := json.Unmarshal(buf.Bytes(), &got); err != nil {
		t.Fatalf("invalid JSON: %v\n%s", err, buf.String())
	}
	if got.Meta.Count != 3 {
		t.Errorf("meta.count = %d, want 3", got.Meta.Count)
	}
	if len(got.Tasks) != 3 {
		t.Errorf("tasks len = %d, want 3", len(got.Tasks))
	}
	// Open task should serialize due
	for _, task := range got.Tasks {
		if task["status"] == "open" {
			if _, ok := task["due"]; !ok {
				t.Error("open task missing due in JSON")
			}
		}
	}
}

func TestTaskBoardAsJSONOmitsEmptyDue(t *testing.T) {
	vm := BuildTaskBoardVM(sampleTaskEvents(), "done")

	var buf bytes.Buffer
	if err := TaskBoardAsJSON(&buf, vm); err != nil {
		t.Fatal(err)
	}
	if strings.Contains(buf.String(), `"due"`) {
		t.Errorf("expected done task without due to omit field: %s", buf.String())
	}
}

func TestTaskBoardAsText(t *testing.T) {
	vm := BuildTaskBoardVM(sampleTaskEvents(), "")

	var buf bytes.Buffer
	if err := TaskBoardAsText(&buf, vm); err != nil {
		t.Fatal(err)
	}
	out := buf.String()
	if !strings.Contains(out, "Ship HH-611") {
		t.Errorf("missing open task: %s", out)
	}
	if !strings.Contains(out, "due Jun 15") {
		t.Errorf("missing due date rendering: %s", out)
	}
	if !strings.Contains(out, "✓") {
		t.Errorf("missing done marker: %s", out)
	}
}

func TestTaskBoardAsTextEmpty(t *testing.T) {
	vm := BuildTaskBoardVM(nil, "")
	var buf bytes.Buffer
	if err := TaskBoardAsText(&buf, vm); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(buf.String(), "No tasks found") {
		t.Errorf("expected empty-state message: %s", buf.String())
	}
}

func TestTaskBoardAsHTMLUsesLoader(t *testing.T) {
	vm := BuildTaskBoardVM(sampleTaskEvents(), "")

	var buf bytes.Buffer
	if err := TaskBoardAsHTML(&buf, vm, &EmbedLoader{}); err != nil {
		t.Fatal(err)
	}
	html := buf.String()
	if !strings.Contains(html, "Ship HH-611") {
		t.Errorf("rendered HTML missing open task")
	}
	if !strings.Contains(html, "All tasks") {
		t.Errorf("rendered HTML missing label")
	}
	if !strings.Contains(html, "group--open") {
		t.Errorf("rendered HTML missing status group class")
	}
}
