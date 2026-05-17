package skill

import (
	"fmt"
	"strings"
)

func renderSkillTemplate(sk *Skill) string {
	var b strings.Builder

	b.WriteString("---\n")
	fmt.Fprintf(&b, "name: %s\n", sk.Name)
	if sk.Description != "" {
		b.WriteString("description: |\n")
		for _, line := range strings.Split(sk.Description, "\n") {
			fmt.Fprintf(&b, "  %s\n", strings.TrimSpace(line))
		}
	} else {
		fmt.Fprintf(&b, "description: A custom skill for %s\n", sk.Name)
	}
	fmt.Fprintf(&b, "version: %s\n", sk.Version)
	if sk.Author != "" {
		fmt.Fprintf(&b, "author: %s\n", sk.Author)
	}
	fmt.Fprintf(&b, "event_types: [%s]\n", strings.Join(sk.EventTypes, ", "))
	fmt.Fprintf(&b, "task_statuses: [%s]\n", strings.Join(sk.TaskStatuses, ", "))
	fmt.Fprintf(&b, "vault_path: %s\n", sk.VaultPath)
	b.WriteString("triggers:\n")
	b.WriteString("  # Discovery hints. The body below defines the real judgment.\n")
	fmt.Fprintf(&b, "  - %s\n", sk.Name)
	fmt.Fprintf(&b, "  - /%s\n", sk.Name)
	b.WriteString("---\n\n")

	fmt.Fprintf(&b, "# %s\n\n", sk.Name)
	if sk.Description != "" {
		fmt.Fprintf(&b, "%s\n\n", sk.Description)
	}
	b.WriteString("---\n\n")

	b.WriteString("## 1. Vault setup\n\n")
	fmt.Fprintf(&b, "The vault lives at `%s`.\n\n", sk.VaultPath)
	b.WriteString("**Creating the vault** (first time only):\n\n")
	b.WriteString("```bash\n")
	fmt.Fprintf(&b, "mkdir -p %s/events\n", sk.VaultPath)
	b.WriteString("```\n\n")
	b.WriteString("---\n\n")

	b.WriteString("## 2. Capturing events\n\n")
	b.WriteString("Use judgment. When the user says something in this domain with future value, **write a markdown file**.\n\n")
	b.WriteString("### File path\n\n")
	b.WriteString("```\n")
	fmt.Fprintf(&b, "%s/events/YYYY/MM/DD/<ulid>-<slug>.md\n", sk.VaultPath)
	b.WriteString("```\n\n")
	b.WriteString("### File format\n\n")
	b.WriteString("```markdown\n")
	b.WriteString("---\n")
	b.WriteString("id: <ULID>\n")
	b.WriteString("schema: 1\n")
	fmt.Fprintf(&b, "type: %s\n", sk.EventTypes[0])
	b.WriteString("created_at: <ISO-8601 UTC>\n")
	b.WriteString("source: agent\n")
	b.WriteString("agent: <your-name>\n")
	b.WriteString("tags: []\n")
	b.WriteString("links: []\n")
	if contains(sk.EventTypes, "task") {
		b.WriteString("status: open\n")
	}
	b.WriteString("---\n\n")
	b.WriteString("Event body goes here.\n")
	b.WriteString("```\n\n")

	b.WriteString("### Event types\n\n")
	b.WriteString("| Type | When |\n")
	b.WriteString("| --- | --- |\n")
	for _, t := range sk.EventTypes {
		fmt.Fprintf(&b, "| `%s` | Describe when to use this type |\n", t)
	}
	b.WriteString("\n")

	if contains(sk.EventTypes, "task") && len(sk.TaskStatuses) > 0 {
		b.WriteString("### Task statuses\n\n")
		b.WriteString("| Status | Meaning |\n")
		b.WriteString("| --- | --- |\n")
		for _, s := range sk.TaskStatuses {
			fmt.Fprintf(&b, "| `%s` | Describe this status |\n", s)
		}
		b.WriteString("\n")
	}

	b.WriteString("### Capture rules\n\n")
	b.WriteString("1. **Use the user's phrasing.** Don't paraphrase or correct.\n")
	b.WriteString("2. **One thought per file.** Three thoughts = three files.\n")
	b.WriteString("3. **Do not depend on exact trigger phrases.** They are discovery hints only.\n")
	b.WriteString("4. **Capture silently when in doubt.** Lost thought > stray event.\n\n")
	b.WriteString("---\n\n")

	b.WriteString("## 3. Querying events\n\n")
	b.WriteString("Use your file tools to read and filter events.\n\n")
	b.WriteString("```bash\n")
	b.WriteString("# Recent events\n")
	fmt.Fprintf(&b, "find %s/events -name \"*.md\" -mtime -7 | sort\n\n", sk.VaultPath)
	b.WriteString("# Filter by type\n")
	fmt.Fprintf(&b, "grep -rl \"^type: %s\" %s/events/ | sort\n\n", sk.EventTypes[0], sk.VaultPath)
	b.WriteString("# Search content\n")
	fmt.Fprintf(&b, "grep -rl \"keyword\" %s/events/ | sort\n", sk.VaultPath)
	b.WriteString("```\n\n")
	b.WriteString("---\n\n")

	b.WriteString("## Output style\n\n")
	b.WriteString("Never narrate your process. Just act, then give the shortest possible response.\n\n")
	b.WriteString("- **Capture:** One line. `✓ saved`. Nothing else.\n")
	b.WriteString("- **Query:** Answer directly. No preamble.\n")
	b.WriteString("- **Error:** One line. What failed.\n")

	return b.String()
}

func contains(ss []string, s string) bool {
	for _, v := range ss {
		if v == s {
			return true
		}
	}
	return false
}
