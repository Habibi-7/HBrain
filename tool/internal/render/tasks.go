package render

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/Habibi-7/hbrain/tool/internal/event"
)

// TaskItem is the per-task entry inside a TaskBoardVM. Drives both the JSON
// envelope and the HTML template.
type TaskItem struct {
	Title     string     `json:"title"`
	Status    string     `json:"status"`
	CreatedAt time.Time  `json:"created_at"`
	Tags      []string   `json:"tags,omitempty"`
	Due       *time.Time `json:"due,omitempty"`
}

// StatusGroup buckets tasks by their status for the HTML template's grouped
// layout. Order is fixed: open → done → blocked → cancelled.
type StatusGroup struct {
	Status string
	Label  string
	Count  int
	Tasks  []TaskItem
}

// TaskBoardVM is the typed ViewModel for the Tasks view.
type TaskBoardVM struct {
	Label       string
	TotalCount  int
	Groups      []StatusGroup
	Tasks       []TaskItem
	GeneratedAt string
}

// Fixed render order for status groups.
var statusOrder = []event.Status{event.Open, event.Done, event.Blocked, event.Cancelled}

// BuildTaskBoardVM filters events to tasks, optionally narrows by status,
// and assembles a board grouped by status. Tasks within each group are
// sorted newest-first.
//
// statusFilter == "" returns all statuses. Non-empty matches Status exactly.
func BuildTaskBoardVM(events []*event.Event, statusFilter string) TaskBoardVM {
	var tasks []*event.Event
	for _, ev := range events {
		if ev.Type != "task" {
			continue
		}
		if statusFilter != "" && string(ev.Status) != statusFilter {
			continue
		}
		tasks = append(tasks, ev)
	}

	sortTasksDesc(tasks)

	flat := make([]TaskItem, 0, len(tasks))
	for _, t := range tasks {
		flat = append(flat, taskItemOf(t))
	}

	groupMap := make(map[event.Status][]TaskItem)
	for _, t := range tasks {
		groupMap[t.Status] = append(groupMap[t.Status], taskItemOf(t))
	}

	var groups []StatusGroup
	for _, s := range statusOrder {
		items := groupMap[s]
		if len(items) == 0 {
			continue
		}
		groups = append(groups, StatusGroup{
			Status: string(s),
			Label:  statusLabel(s),
			Count:  len(items),
			Tasks:  items,
		})
	}

	label := "All tasks"
	if statusFilter != "" {
		label = statusLabel(event.Status(statusFilter)) + " tasks"
	}

	return TaskBoardVM{
		Label:       label,
		TotalCount:  len(tasks),
		Groups:      groups,
		Tasks:       flat,
		GeneratedAt: time.Now().UTC().Format("2006-01-02 15:04 UTC"),
	}
}

// TaskBoardAsHTML renders the board through the supplied TemplateLoader.
func TaskBoardAsHTML(w io.Writer, vm TaskBoardVM, loader TemplateLoader) error {
	tmpl, err := loader.Load("tasks.html")
	if err != nil {
		return err
	}
	return tmpl.Execute(w, vm)
}

// TaskBoardAsJSON writes a flat envelope:
//
//	{"meta": {"label": "...", "count": N}, "tasks": [...]}
func TaskBoardAsJSON(w io.Writer, vm TaskBoardVM) error {
	envelope := struct {
		Meta  map[string]any `json:"meta"`
		Tasks []TaskItem     `json:"tasks"`
	}{
		Meta: map[string]any{
			"label": vm.Label,
			"count": vm.TotalCount,
		},
		Tasks: vm.Tasks,
	}
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	return enc.Encode(envelope)
}

// TaskBoardAsText writes the same emoji-marker output the CLI has shipped
// since v0.1, now driven from the ViewModel.
func TaskBoardAsText(w io.Writer, vm TaskBoardVM) error {
	if vm.TotalCount == 0 {
		fmt.Fprintln(w, "No tasks found.")
		return nil
	}

	fmt.Fprintf(w, "%s (%d)\n\n", vm.Label, vm.TotalCount)
	for _, t := range vm.Tasks {
		marker := statusMarker(event.Status(t.Status))
		date := t.CreatedAt.Format("Jan 2")
		due := ""
		if t.Due != nil {
			due = "  due " + t.Due.Format("Jan 2")
		}
		tags := ""
		if len(t.Tags) > 0 {
			tags = "  #" + strings.Join(t.Tags, " #")
		}
		fmt.Fprintf(w, "  %s %s  %s%s%s\n", marker, t.Title, date, due, tags)
	}
	return nil
}

func taskItemOf(ev *event.Event) TaskItem {
	return TaskItem{
		Title:     ev.Title(),
		Status:    string(ev.Status),
		CreatedAt: ev.CreatedAt,
		Tags:      ev.Tags,
		Due:       ev.Due,
	}
}

func sortTasksDesc(tasks []*event.Event) {
	event.SortByTime(tasks)
}

func statusLabel(s event.Status) string {
	switch s {
	case event.Open:
		return "Open"
	case event.Done:
		return "Done"
	case event.Blocked:
		return "Blocked"
	case event.Cancelled:
		return "Cancelled"
	default:
		return strings.ToUpper(string(s)[:1]) + string(s)[1:]
	}
}

func statusMarker(s event.Status) string {
	switch s {
	case event.Done:
		return "✓"
	case event.Blocked:
		return "⊘"
	case event.Cancelled:
		return "✕"
	default:
		return "○"
	}
}
