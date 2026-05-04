package render

import (
	"embed"
	"html/template"
	"io"
	"time"

	"github.com/Habibi-7/LSB/tool/internal/event"
)

//go:embed templates/*.html
var templateFS embed.FS

type DayGroup struct {
	DateLabel string
	Events    []EventData
}

type EventData struct {
	Type  string
	Time  string
	Title string
	Tags  string
}

type TimelineData struct {
	RangeLabel  string
	EventCount  int
	DayGroups   []DayGroup
	GeneratedAt string
}

func Timeline(w io.Writer, events []*event.Event, rangeLabel string) error {
	event.SortByTimeAsc(events)

	groups := groupByDay(events)

	data := TimelineData{
		RangeLabel:  rangeLabel,
		EventCount:  len(events),
		DayGroups:   groups,
		GeneratedAt: time.Now().UTC().Format("2006-01-02 15:04 UTC"),
	}

	tmpl, err := template.New("timeline.html").ParseFS(templateFS, "templates/timeline.html")
	if err != nil {
		return err
	}

	return tmpl.Execute(w, data)
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
			for i, t := range ev.Tags {
				if i > 0 {
					tags += " "
				}
				tags += "#" + t
			}
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
