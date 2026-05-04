package view

import (
	"fmt"
	"io"
	"strings"

	"github.com/Habibi-7/LSB/tool/internal/event"
	"github.com/Habibi-7/LSB/tool/internal/vault"
)

func Tasks(w io.Writer, v *vault.Vault, status string) error {
	all, err := v.AllEvents()
	if err != nil {
		return err
	}

	var tasks []*event.Event
	for _, ev := range all {
		if ev.Type != event.Task {
			continue
		}
		if status != "" && string(ev.Status) != status {
			continue
		}
		tasks = append(tasks, ev)
	}

	event.SortByTime(tasks)

	if len(tasks) == 0 {
		fmt.Fprintf(w, "No tasks found")
		if status != "" {
			fmt.Fprintf(w, " with status=%s", status)
		}
		fmt.Fprintln(w, ".")
		return nil
	}

	label := "All tasks"
	if status != "" {
		label = capitalize(status) + " tasks"
	}
	fmt.Fprintf(w, "%s (%d)\n\n", label, len(tasks))

	for _, t := range tasks {
		marker := "○"
		switch t.Status {
		case event.Done:
			marker = "✓"
		case event.Blocked:
			marker = "⊘"
		case event.Cancelled:
			marker = "✕"
		}
		date := t.CreatedAt.Format("Jan 2")
		tags := ""
		if len(t.Tags) > 0 {
			tags = "  #" + strings.Join(t.Tags, " #")
		}
		fmt.Fprintf(w, "  %s %s  %s%s\n", marker, t.Title(), date, tags)
	}

	return nil
}

func capitalize(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}
