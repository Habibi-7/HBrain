package view

import (
	"fmt"
	"time"

	"github.com/Habibi-7/hbrain/tool/internal/event"
	"github.com/Habibi-7/hbrain/tool/internal/render"
	"github.com/Habibi-7/hbrain/tool/internal/vault"
)

// Timeline gathers events from the vault and returns a typed ViewModel
// ready for any format adapter (HTML, JSON, text). Format choice happens
// in main.go.
func Timeline(v *vault.Vault, days int) (render.TimelineVM, error) {
	all, err := v.AllEvents()
	if err != nil {
		return render.TimelineVM{}, err
	}

	cutoff := time.Now().UTC().AddDate(0, 0, -days)
	var filtered []*event.Event
	for _, ev := range all {
		if ev.CreatedAt.After(cutoff) {
			filtered = append(filtered, ev)
		}
	}

	label := fmt.Sprintf("Last %d days", days)
	if days == 1 {
		label = "Today"
	} else if days == 7 {
		label = "This week"
	}

	return render.BuildTimelineVM(filtered, label), nil
}
