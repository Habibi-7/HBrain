// Package frontmatter parses YAML-flavored frontmatter blocks from markdown files.
//
// Supports three value shapes:
//   - simple scalar:  key: value
//   - multiline block: key: | (or >) followed by indented lines
//   - block list:     key: followed by "- item" lines
//
// Inline lists ([a, b, c]) are stored as raw strings; consumers parse with ParseInlineList.
package frontmatter

import (
	"bufio"
	"fmt"
	"io"
	"strings"
)

// Parse reads a frontmatter block delimited by "---" lines, returning a
// flat map of keys to raw string values and the remaining body.
func Parse(r io.Reader) (map[string]string, string, error) {
	scanner := bufio.NewScanner(r)

	if !scanner.Scan() || strings.TrimSpace(scanner.Text()) != "---" {
		return nil, "", fmt.Errorf("missing frontmatter opening")
	}

	var fmLines []string
	for scanner.Scan() {
		line := scanner.Text()
		if strings.TrimSpace(line) == "---" {
			break
		}
		fmLines = append(fmLines, line)
	}

	meta := make(map[string]string)
	parseLines(fmLines, meta)

	var bodyLines []string
	for scanner.Scan() {
		bodyLines = append(bodyLines, scanner.Text())
	}

	return meta, strings.Join(bodyLines, "\n"), scanner.Err()
}

func parseLines(lines []string, meta map[string]string) {
	i := 0
	for i < len(lines) {
		line := lines[i]
		key, val, ok := splitKV(line)
		i++
		if !ok {
			continue
		}

		if val == "|" || val == ">" {
			var collected []string
			for i < len(lines) {
				next := lines[i]
				if next == "" || isIndented(next) {
					collected = append(collected, strings.TrimSpace(next))
					i++
					continue
				}
				break
			}
			meta[key] = strings.TrimSpace(strings.Join(collected, "\n"))
			continue
		}

		if val == "" && i < len(lines) {
			trimmed := strings.TrimSpace(lines[i])
			if strings.HasPrefix(trimmed, "- ") {
				var items []string
				for i < len(lines) {
					nt := strings.TrimSpace(lines[i])
					if strings.HasPrefix(nt, "- ") {
						items = append(items, nt)
						i++
						continue
					}
					if nt == "" {
						i++
						continue
					}
					break
				}
				meta[key] = strings.Join(items, "\n")
				continue
			}
		}

		meta[key] = val
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

func isIndented(line string) bool {
	return strings.HasPrefix(line, "  ") || strings.HasPrefix(line, "\t")
}

// ParseInlineList parses an inline YAML list like "[a, b, c]" into a slice.
// Returns nil for "[]" or empty input.
func ParseInlineList(val string) []string {
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

// ParseBlockList parses a block list value (newline-separated "- item" lines)
// into a slice of item strings.
func ParseBlockList(val string) []string {
	if val == "" {
		return nil
	}
	var result []string
	for _, line := range strings.Split(val, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "- ") {
			result = append(result, strings.TrimSpace(strings.TrimPrefix(line, "- ")))
		}
	}
	return result
}
