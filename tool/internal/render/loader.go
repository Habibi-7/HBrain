// Package render renders view models into HTML, JSON, or text via a
// pluggable TemplateLoader.
package render

import (
	"embed"
	"fmt"
	"html/template"
	"os"
	"path/filepath"
)

// embeddedFS holds the default templates baked into the binary at build time.
// Contents are copied from skill/templates/ by `make prep`.
//
//go:embed templates/*.html
var embeddedFS embed.FS

// TemplateLoader resolves a template by name (e.g. "timeline.html") into a
// parsed *html/template.Template. Implementations may read from disk, an
// embedded filesystem, or anywhere else.
type TemplateLoader interface {
	Load(name string) (*template.Template, error)
}

// FileLoader reads templates from a directory on disk at call time. Useful
// for letting users override defaults without recompiling — e.g. a custom
// timeline.html dropped into $BRAIN_DIR/.brain/templates/.
type FileLoader struct {
	Dir string
}

func (l *FileLoader) Load(name string) (*template.Template, error) {
	path := filepath.Join(l.Dir, name)
	if _, err := os.Stat(path); err != nil {
		return nil, err
	}
	return template.New(name).ParseFiles(path)
}

// EmbedLoader serves the binary's built-in default templates, baked in at
// build time. Falls through when no vault-level override exists.
type EmbedLoader struct{}

func (l *EmbedLoader) Load(name string) (*template.Template, error) {
	return template.New(name).ParseFS(embeddedFS, "templates/"+name)
}

// ChainLoader tries each underlying loader in order, returning the first
// successful Load. Returns the last error if all fail.
type ChainLoader struct {
	Loaders []TemplateLoader
}

func (l *ChainLoader) Load(name string) (*template.Template, error) {
	var lastErr error
	for _, ld := range l.Loaders {
		tmpl, err := ld.Load(name)
		if err == nil {
			return tmpl, nil
		}
		lastErr = err
	}
	if lastErr == nil {
		return nil, fmt.Errorf("no loaders configured for %q", name)
	}
	return nil, lastErr
}

// DefaultLoader returns a loader that prefers vault-level overrides
// (vaultTemplatesDir) and falls back to embedded defaults.
func DefaultLoader(vaultTemplatesDir string) TemplateLoader {
	return &ChainLoader{
		Loaders: []TemplateLoader{
			&FileLoader{Dir: vaultTemplatesDir},
			&EmbedLoader{},
		},
	}
}
