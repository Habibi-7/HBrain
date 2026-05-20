package render

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/Habibi-7/hbrain/tool/internal/event"
)

func sampleEvents() []*event.Event {
	due := time.Date(2026, 6, 10, 0, 0, 0, 0, time.UTC)
	return []*event.Event{
		{
			Type:      event.Note,
			CreatedAt: time.Date(2026, 5, 20, 9, 0, 0, 0, time.UTC),
			Body:      "Note one",
			Tags:      []string{"work"},
		},
		{
			Type:      event.Task,
			CreatedAt: time.Date(2026, 5, 20, 14, 30, 0, 0, time.UTC),
			Body:      "Ship the thing",
			Status:    event.Open,
			Due:       &due,
		},
	}
}

func TestBuildTimelineVM(t *testing.T) {
	vm := BuildTimelineVM(sampleEvents(), "This week")

	if vm.RangeLabel != "This week" {
		t.Errorf("RangeLabel = %q", vm.RangeLabel)
	}
	if vm.EventCount != 2 {
		t.Errorf("EventCount = %d, want 2", vm.EventCount)
	}
	if len(vm.Events) != 2 {
		t.Errorf("Events len = %d, want 2", len(vm.Events))
	}
	if len(vm.DayGroups) != 1 {
		t.Errorf("DayGroups len = %d, want 1 (both same day)", len(vm.DayGroups))
	}
	if vm.Events[1].Due == nil {
		t.Error("task event missing Due in flattened list")
	}
}

func TestTimelineAsJSONEnvelopeShape(t *testing.T) {
	vm := BuildTimelineVM(sampleEvents(), "This week")

	var buf bytes.Buffer
	if err := TimelineAsJSON(&buf, vm); err != nil {
		t.Fatal(err)
	}

	var got struct {
		Meta struct {
			RangeLabel string `json:"range_label"`
			Count      int    `json:"count"`
		} `json:"meta"`
		Events []map[string]any `json:"events"`
	}
	if err := json.Unmarshal(buf.Bytes(), &got); err != nil {
		t.Fatalf("invalid JSON: %v\n%s", err, buf.String())
	}
	if got.Meta.RangeLabel != "This week" {
		t.Errorf("meta.range_label = %q", got.Meta.RangeLabel)
	}
	if got.Meta.Count != 2 {
		t.Errorf("meta.count = %d, want 2", got.Meta.Count)
	}
	if len(got.Events) != 2 {
		t.Fatalf("events len = %d, want 2", len(got.Events))
	}
	// Task event should serialize due
	for _, e := range got.Events {
		if e["type"] == "task" {
			if _, ok := e["due"]; !ok {
				t.Error("task event missing due in JSON")
			}
		}
	}
}

func TestTimelineAsJSONOmitsEmptyOptionals(t *testing.T) {
	// Note event has no Status and no Due — both should be omitted from JSON.
	vm := BuildTimelineVM([]*event.Event{
		{
			Type:      event.Note,
			CreatedAt: time.Date(2026, 5, 20, 9, 0, 0, 0, time.UTC),
			Body:      "x",
		},
	}, "Today")

	var buf bytes.Buffer
	if err := TimelineAsJSON(&buf, vm); err != nil {
		t.Fatal(err)
	}
	s := buf.String()
	if strings.Contains(s, `"due"`) {
		t.Errorf("expected due to be omitted: %s", s)
	}
	if strings.Contains(s, `"status"`) {
		t.Errorf("expected empty status to be omitted: %s", s)
	}
}

func TestTimelineAsText(t *testing.T) {
	vm := BuildTimelineVM(sampleEvents(), "This week")

	var buf bytes.Buffer
	if err := TimelineAsText(&buf, vm); err != nil {
		t.Fatal(err)
	}
	out := buf.String()
	if !strings.Contains(out, "This week") {
		t.Errorf("missing range label: %s", out)
	}
	if !strings.Contains(out, "[note]") || !strings.Contains(out, "[task]") {
		t.Errorf("missing type markers: %s", out)
	}
	if !strings.Contains(out, "Ship the thing") {
		t.Errorf("missing event title: %s", out)
	}
}

func TestTimelineAsHTMLUsesLoader(t *testing.T) {
	vm := BuildTimelineVM(sampleEvents(), "Today")

	var buf bytes.Buffer
	loader := &EmbedLoader{}
	if err := TimelineAsHTML(&buf, vm, loader); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(buf.String(), "Today") {
		t.Errorf("rendered HTML missing range label")
	}
}
