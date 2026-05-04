package view

import (
	"fmt"
	"io"
	"time"

	"github.com/Habibi-7/living-brain/tool/internal/event"
	"github.com/Habibi-7/living-brain/tool/internal/render"
	"github.com/Habibi-7/living-brain/tool/internal/vault"
)

func Timeline(w io.Writer, v *vault.Vault, days int) error {
	all, err := v.AllEvents()
	if err != nil {
		return err
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

	return render.Timeline(w, filtered, label)
}
