package view

import (
	"github.com/Habibi-7/hbrain/tool/internal/render"
	"github.com/Habibi-7/hbrain/tool/internal/vault"
)

// Tasks gathers all task events from the vault and returns a TaskBoardVM
// ready for any format adapter (HTML, JSON, text). statusFilter narrows by
// status (empty = all statuses).
func Tasks(v *vault.Vault, statusFilter string) (render.TaskBoardVM, error) {
	all, err := v.AllEvents()
	if err != nil {
		return render.TaskBoardVM{}, err
	}
	return render.BuildTaskBoardVM(all, statusFilter), nil
}
