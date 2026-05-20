package render

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/Habibi-7/hbrain/tool/internal/event"
)

// DayGroup is a day-bucket of events. Used by the HTML template for the
// visual day-separated layout.
type DayGroup struct {
	DateLabel string
	Events    []EventData
}

// EventData is the template-friendly view of an event used inside DayGroup.
type EventData struct {
	Type  string
	Time  string
	Title string
	Tags  string
}

// TimelineEvent is the flat JSON-friendly shape of one event in a Timeline.
// Field tags drive the JSON envelope produced by TimelineAsJSON.
type TimelineEvent struct {
	Type      string     `json:"type"`
	Title     string     `json:"title"`
	CreatedAt time.Time  `json:"created_at"`
	Tags      []string   `json:"tags,omitempty"`
	Status    string     `json:"status,omitempty"`
	Due       *time.Time `json:"due,omitempty"`
}

// TimelineVM is the typed ViewModel for the Timeline view. It carries
// everything every format adapter (HTML, JSON, text) might need.
//
// DayGroups feeds the HTML template; Events feeds the JSON envelope and the
// text adapter.
type TimelineVM struct {
	RangeLabel  string
	EventCount  int
	DayGroups   []DayGroup
	Events      []TimelineEvent
	GeneratedAt string
}

// BuildTimelineVM converts a slice of events into a Timeline ViewModel.
// Events are sorted oldest-first.
func BuildTimelineVM(events []*event.Event, rangeLabel string) TimelineVM {
	event.SortByTimeAsc(events)

	return TimelineVM{
		RangeLabel:  rangeLabel,
		EventCount:  len(events),
		DayGroups:   groupByDay(events),
		Events:      flattenEvents(events),
		GeneratedAt: time.Now().UTC().Format("2006-01-02 15:04 UTC"),
	}
}

// TimelineAsHTML renders the ViewModel to HTML using the supplied loader.
func TimelineAsHTML(w io.Writer, vm TimelineVM, loader TemplateLoader) error {
	tmpl, err := loader.Load("timeline.html")
	if err != nil {
		return err
	}
	return tmpl.Execute(w, vm)
}

// TimelineAsJSON writes a flat envelope:
//
//	{"meta": {"range_label": "...", "count": N}, "events": [...]}
//
// Intended for agent consumption when building custom HTML artifacts.
func TimelineAsJSON(w io.Writer, vm TimelineVM) error {
	envelope := struct {
		Meta   map[string]any  `json:"meta"`
		Events []TimelineEvent `json:"events"`
	}{
		Meta: map[string]any{
			"range_label": vm.RangeLabel,
			"count":       vm.EventCount,
		},
		Events: vm.Events,
	}
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	return enc.Encode(envelope)
}

// TimelineAsText writes a plain-text rendering, day-grouped.
func TimelineAsText(w io.Writer, vm TimelineVM) error {
	fmt.Fprintf(w, "Timeline · %s (%d events)\n\n", vm.RangeLabel, vm.EventCount)
	for _, g := range vm.DayGroups {
		fmt.Fprintf(w, "%s\n", g.DateLabel)
		for _, ev := range g.Events {
			line := fmt.Sprintf("  %s  %-9s %s", ev.Time, "["+ev.Type+"]", ev.Title)
			if ev.Tags != "" {
				line += "  " + ev.Tags
			}
			fmt.Fprintln(w, line)
		}
		fmt.Fprintln(w)
	}
	return nil
}

func groupByDay(events []*event.Event) []DayGroup {
	dayMap := make(map[string]*DayGroup)
	var dayOrder []string

	for _, ev := range events {
		key := ev.CreatedAt.Format("2006-01-02")
		g, ok := dayMap[key]
		if !ok {
			label := ev.CreatedAt.Format("Mon, Jan 2")
			g = &DayGroup{DateLabel: label}
			dayMap[key] = g
			dayOrder = append(dayOrder, key)
		}

		tags := ""
		if len(ev.Tags) > 0 {
			tags = "#" + strings.Join(ev.Tags, " #")
		}

		g.Events = append(g.Events, EventData{
			Type:  string(ev.Type),
			Time:  ev.CreatedAt.Format("15:04"),
			Title: ev.Title(),
			Tags:  tags,
		})
	}

	var groups []DayGroup
	for _, key := range dayOrder {
		groups = append(groups, *dayMap[key])
	}
	return groups
}

func flattenEvents(events []*event.Event) []TimelineEvent {
	out := make([]TimelineEvent, 0, len(events))
	for _, ev := range events {
		out = append(out, TimelineEvent{
			Type:      string(ev.Type),
			Title:     ev.Title(),
			CreatedAt: ev.CreatedAt,
			Tags:      ev.Tags,
			Status:    string(ev.Status),
			Due:       ev.Due,
		})
	}
	return out
}
