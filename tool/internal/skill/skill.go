package skill

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"strings"
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
	scanner := bufio.NewScanner(r)

	if !scanner.Scan() || strings.TrimSpace(scanner.Text()) != "---" {
		return nil, fmt.Errorf("missing frontmatter opening")
	}

	var fmLines []string
	inMultiline := ""
	for scanner.Scan() {
		line := scanner.Text()
		if strings.TrimSpace(line) == "---" && inMultiline == "" {
			break
		}

		if inMultiline != "" {
			trimmed := strings.TrimSpace(line)
			if trimmed == "" || (!strings.HasPrefix(line, "  ") && !strings.HasPrefix(line, "\t") && !strings.HasPrefix(trimmed, "-") && !strings.HasPrefix(trimmed, "#")) {
				if strings.Contains(trimmed, ":") && !strings.HasPrefix(trimmed, "-") {
					inMultiline = ""
					fmLines = append(fmLines, line)
					continue
				}
			}
			fmLines = append(fmLines, line)
			continue
		}

		fmLines = append(fmLines, line)
		_, val, ok := splitKV(line)
		if ok && (val == "|" || val == ">") {
			key, _, _ := splitKV(line)
			inMultiline = key
		}
	}

	sk := &Skill{FilePath: filePath, Version: "1.0.0"}
	parseFrontmatter(fmLines, sk)

	var bodyLines []string
	for scanner.Scan() {
		bodyLines = append(bodyLines, scanner.Text())
	}
	sk.Body = strings.Join(bodyLines, "\n")

	return sk, scanner.Err()
}

func ParseFile(path string) (*Skill, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return Parse(f, path)
}

func parseFrontmatter(lines []string, sk *Skill) {
	inTriggers := false
	inDescription := false

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		if inTriggers {
			if strings.HasPrefix(trimmed, "- ") {
				sk.Triggers = append(sk.Triggers, strings.TrimPrefix(trimmed, "- "))
				continue
			}
			if trimmed == "" {
				continue
			}
			if strings.Contains(trimmed, ":") && !strings.HasPrefix(trimmed, "-") {
				inTriggers = false
			} else {
				continue
			}
		}

		if inDescription {
			if strings.HasPrefix(line, "  ") || strings.HasPrefix(line, "\t") || trimmed == "" {
				if sk.Description != "" {
					sk.Description += " "
				}
				sk.Description += trimmed
				continue
			}
			inDescription = false
			sk.Description = strings.TrimSpace(sk.Description)
		}

		key, val, ok := splitKV(line)
		if !ok {
			continue
		}
		switch key {
		case "name":
			sk.Name = val
		case "description":
			if val == "|" || val == ">" {
				inDescription = true
				sk.Description = ""
			} else {
				sk.Description = val
			}
		case "version":
			sk.Version = val
		case "author":
			sk.Author = val
		case "event_types":
			sk.EventTypes = parseYAMLList(val)
		case "task_statuses":
			sk.TaskStatuses = parseYAMLList(val)
		case "vault_path":
			sk.VaultPath = val
		case "triggers":
			inTriggers = true
		}
	}
}

func splitKV(line string) (string, string, bool) {
	idx := strings.Index(line, ":")
	if idx < 0 {
		return "", "", false
	}
	key := strings.TrimSpace(line[:idx])
	val := strings.TrimSpace(line[idx+1:])
	return key, val, true
}

func parseYAMLList(val string) []string {
	val = strings.TrimSpace(val)
	if val == "[]" || val == "" {
		return nil
	}
	val = strings.TrimPrefix(val, "[")
	val = strings.TrimSuffix(val, "]")
	parts := strings.Split(val, ",")
	var result []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}
