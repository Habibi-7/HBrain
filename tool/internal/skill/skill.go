package skill

import (
	"io"
	"os"

	"github.com/Habibi-7/hbrain/tool/internal/frontmatter"
)

type Skill struct {
	Name         string
	Description  string
	Version      string
	Author       string
	EventTypes   []string
	TaskStatuses []string
	VaultPath    string
	Triggers     []string
	Body         string
	FilePath     string
}

func Parse(r io.Reader, filePath string) (*Skill, error) {
	meta, body, err := frontmatter.Parse(r)
	if err != nil {
		return nil, err
	}

	sk := &Skill{FilePath: filePath, Version: "1.0.0", Body: body}
	for key, val := range meta {
		switch key {
		case "name":
			sk.Name = val
		case "description":
			sk.Description = val
		case "version":
			sk.Version = val
		case "author":
			sk.Author = val
		case "event_types":
			sk.EventTypes = frontmatter.ParseInlineList(val)
		case "task_statuses":
			sk.TaskStatuses = frontmatter.ParseInlineList(val)
		case "vault_path":
			sk.VaultPath = val
		case "triggers":
			sk.Triggers = frontmatter.ParseBlockList(val)
		}
	}
	return sk, nil
}

func ParseFile(path string) (*Skill, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return Parse(f, path)
}
