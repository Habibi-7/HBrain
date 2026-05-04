package skill

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type Store struct {
	Root string
}

func NewStore(brainDir string) *Store {
	return &Store{Root: filepath.Join(brainDir, "skills")}
}

func DiscoverStore() (*Store, error) {
	dir := os.Getenv("BRAIN_DIR")
	if dir != "" {
		dir = expandHome(dir)
	} else {
		home, err := os.UserHomeDir()
		if err != nil {
			return nil, err
		}
		dir = filepath.Join(home, "brain")
	}
	return NewStore(dir), nil
}

func (s *Store) List() ([]*Skill, error) {
	entries, err := os.ReadDir(s.Root)
	if os.IsNotExist(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var skills []*Skill
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		sk, err := s.Get(entry.Name())
		if err != nil {
			continue
		}
		skills = append(skills, sk)
	}
	return skills, nil
}

func (s *Store) Get(name string) (*Skill, error) {
	skillFile := filepath.Join(s.Root, name, "SKILL.md")
	sk, err := ParseFile(skillFile)
	if err != nil {
		return nil, fmt.Errorf("skill %q: %w", name, err)
	}
	if sk.Name == "" {
		sk.Name = name
	}
	return sk, nil
}

func (s *Store) Create(name, description string, eventTypes, taskStatuses []string) (*Skill, error) {
	name = sanitizeName(name)
	skillDir := filepath.Join(s.Root, name)

	if _, err := os.Stat(skillDir); err == nil {
		return nil, fmt.Errorf("skill %q already exists", name)
	}

	if err := os.MkdirAll(skillDir, 0755); err != nil {
		return nil, err
	}

	if len(eventTypes) == 0 {
		eventTypes = []string{"note", "task", "decision", "fact", "link"}
	}
	if len(taskStatuses) == 0 {
		taskStatuses = []string{"open", "done", "blocked", "cancelled"}
	}

	sk := &Skill{
		Name:         name,
		Description:  description,
		Version:      "1.0.0",
		EventTypes:   eventTypes,
		TaskStatuses: taskStatuses,
		VaultPath:    fmt.Sprintf("~/brain/skills/%s/vault", name),
	}

	content := renderSkillTemplate(sk)
	skillFile := filepath.Join(skillDir, "SKILL.md")
	if err := os.WriteFile(skillFile, []byte(content), 0644); err != nil {
		return nil, err
	}

	vaultDir := filepath.Join(skillDir, "vault", "events")
	if err := os.MkdirAll(vaultDir, 0755); err != nil {
		return nil, err
	}

	sk.FilePath = skillFile
	return sk, nil
}

func (s *Store) Exists(name string) bool {
	skillDir := filepath.Join(s.Root, name)
	_, err := os.Stat(skillDir)
	return err == nil
}

func sanitizeName(name string) string {
	name = strings.ToLower(name)
	name = strings.Map(func(r rune) rune {
		if r >= 'a' && r <= 'z' || r >= '0' && r <= '9' || r == '-' {
			return r
		}
		if r == ' ' || r == '_' {
			return '-'
		}
		return -1
	}, name)
	name = strings.Trim(name, "-")
	return name
}

func expandHome(path string) string {
	if strings.HasPrefix(path, "~/") {
		home, err := os.UserHomeDir()
		if err != nil {
			return path
		}
		return filepath.Join(home, path[2:])
	}
	return path
}
