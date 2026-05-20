package render

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestFileLoaderReadsTemplate(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "timeline.html")
	if err := os.WriteFile(path, []byte(`<h1>{{.RangeLabel}}</h1>`), 0644); err != nil {
		t.Fatal(err)
	}

	loader := &FileLoader{Dir: dir}
	tmpl, err := loader.Load("timeline.html")
	if err != nil {
		t.Fatal(err)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, TimelineVM{RangeLabel: "This week"}); err != nil {
		t.Fatal(err)
	}
	if got := buf.String(); !strings.Contains(got, "This week") {
		t.Errorf("rendered = %q, want substring 'This week'", got)
	}
}

func TestFileLoaderMissingFileError(t *testing.T) {
	loader := &FileLoader{Dir: t.TempDir()}
	if _, err := loader.Load("does-not-exist.html"); err == nil {
		t.Error("expected error for missing file, got nil")
	}
}

func TestEmbedLoaderLoadsBundledTemplate(t *testing.T) {
	loader := &EmbedLoader{}
	tmpl, err := loader.Load("timeline.html")
	if err != nil {
		t.Fatal(err)
	}
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, TimelineVM{RangeLabel: "Today", EventCount: 0}); err != nil {
		t.Fatal(err)
	}
	if got := buf.String(); !strings.Contains(got, "Today") {
		t.Errorf("rendered HTML missing RangeLabel: %s", got)
	}
}

func TestChainLoaderFallsBackToEmbed(t *testing.T) {
	emptyDir := t.TempDir()
	loader := &ChainLoader{Loaders: []TemplateLoader{
		&FileLoader{Dir: emptyDir},
		&EmbedLoader{},
	}}

	tmpl, err := loader.Load("timeline.html")
	if err != nil {
		t.Fatal(err)
	}
	if tmpl == nil {
		t.Fatal("expected fallback to return template, got nil")
	}
}

func TestChainLoaderPrefersFile(t *testing.T) {
	dir := t.TempDir()
	custom := `<custom>{{.RangeLabel}}</custom>`
	if err := os.WriteFile(filepath.Join(dir, "timeline.html"), []byte(custom), 0644); err != nil {
		t.Fatal(err)
	}

	loader := &ChainLoader{Loaders: []TemplateLoader{
		&FileLoader{Dir: dir},
		&EmbedLoader{},
	}}

	tmpl, err := loader.Load("timeline.html")
	if err != nil {
		t.Fatal(err)
	}
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, TimelineVM{RangeLabel: "X"}); err != nil {
		t.Fatal(err)
	}
	if got := buf.String(); !strings.Contains(got, "<custom>X</custom>") {
		t.Errorf("file template not preferred: %s", got)
	}
}
