package view

import (
	"fmt"
	"io"
	"math"
	"strings"
	"time"

	"github.com/Habibi-7/hbrain/tool/internal/event"
	"github.com/Habibi-7/hbrain/tool/internal/vault"
)

func Stale(w io.Writer, v *vault.Vault, staleDays int) error {
	all, err := v.AllEvents()
	if err != nil {
		return err
	}

	cutoff := time.Now().UTC().AddDate(0, 0, -staleDays)
	var stale []*event.Event

	for _, ev := range all {
		if ev.Type != event.Task {
			continue
		}
		if ev.Status != event.Open && ev.Status != event.Blocked {
			continue
		}
		if ev.CreatedAt.Before(cutoff) {
			stale = append(stale, ev)
		}
	}

	event.SortByTimeAsc(stale)

	if len(stale) == 0 {
		fmt.Fprintf(w, "No stale tasks (older than %d days).\n", staleDays)
		return nil
	}

	fmt.Fprintf(w, "Stale tasks — open/blocked for %d+ days (%d found)\n\n", staleDays, len(stale))

	now := time.Now().UTC()
	for _, t := range stale {
		age := int(math.Round(now.Sub(t.CreatedAt).Hours() / 24))
		status := string(t.Status)
		tags := ""
		if len(t.Tags) > 0 {
			tags = "  #" + strings.Join(t.Tags, " #")
		}
		fmt.Fprintf(w, "  %dd ago  [%s] %s%s\n", age, status, t.Title(), tags)
	}

	return nil
}
