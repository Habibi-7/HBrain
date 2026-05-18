package view

import (
	"fmt"
	"io"

	"github.com/Habibi-7/hbrain/tool/internal/event"
	"github.com/Habibi-7/hbrain/tool/internal/vault"
)

func Stats(w io.Writer, v *vault.Vault) error {
	all, err := v.AllEvents()
	if err != nil {
		return err
	}

	if len(all) == 0 {
		fmt.Fprintln(w, "Vault is empty.")
		return nil
	}

	typeCounts := make(map[event.Type]int)
	statusCounts := make(map[event.Status]int)
	tagCounts := make(map[string]int)

	for _, ev := range all {
		typeCounts[ev.Type]++
		if ev.Type == event.Task {
			statusCounts[ev.Status]++
		}
		for _, tag := range ev.Tags {
			tagCounts[tag]++
		}
	}

	event.SortByTime(all)
	newest := all[0].CreatedAt.Format("2006-01-02")
	oldest := all[len(all)-1].CreatedAt.Format("2006-01-02")

	fmt.Fprintf(w, "Brain vault — %d events (%s → %s)\n\n", len(all), oldest, newest)

	fmt.Fprintln(w, "By type:")
	for _, t := range []event.Type{event.Note, event.Task, event.Decision, event.Fact, event.Link} {
		if c := typeCounts[t]; c > 0 {
			fmt.Fprintf(w, "  %-10s %d\n", t, c)
		}
	}

	if len(statusCounts) > 0 {
		fmt.Fprintln(w, "\nTasks by status:")
		for _, s := range []event.Status{event.Open, event.Done, event.Blocked, event.Cancelled} {
			if c := statusCounts[s]; c > 0 {
				fmt.Fprintf(w, "  %-10s %d\n", s, c)
			}
		}
	}

	if len(tagCounts) > 0 {
		fmt.Fprintln(w, "\nTop tags:")
		type kv struct {
			k string
			v int
		}
		var sorted []kv
		for k, v := range tagCounts {
			sorted = append(sorted, kv{k, v})
		}
		for i := 0; i < len(sorted); i++ {
			for j := i + 1; j < len(sorted); j++ {
				if sorted[j].v > sorted[i].v {
					sorted[i], sorted[j] = sorted[j], sorted[i]
				}
			}
		}
		limit := 10
		if len(sorted) < limit {
			limit = len(sorted)
		}
		for _, kv := range sorted[:limit] {
			fmt.Fprintf(w, "  #%-12s %d\n", kv.k, kv.v)
		}
	}

	return nil
}
