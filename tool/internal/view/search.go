package view

import (
	"fmt"
	"io"
	"strings"

	"github.com/Habibi-7/living-brain/tool/internal/event"
	"github.com/Habibi-7/living-brain/tool/internal/vault"
)

func Search(w io.Writer, v *vault.Vault, query string) error {
	all, err := v.AllEvents()
	if err != nil {
		return err
	}

	q := strings.ToLower(query)
	var matches []*event.Event

	for _, ev := range all {
		body := strings.ToLower(ev.Body)
		tags := strings.ToLower(strings.Join(ev.Tags, " "))
		if strings.Contains(body, q) || strings.Contains(tags, q) {
			matches = append(matches, ev)
		}
	}

	event.SortByTime(matches)

	if len(matches) == 0 {
		fmt.Fprintf(w, "No events matching %q.\n", query)
		return nil
	}

	fmt.Fprintf(w, "Found %d events matching %q\n\n", len(matches), query)

	for _, ev := range matches {
		date := ev.CreatedAt.Format("2006-01-02 15:04")
		fmt.Fprintf(w, "  [%s] %s  %s\n", ev.Type, ev.Title(), date)
	}

	return nil
}
