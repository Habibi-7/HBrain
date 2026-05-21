VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS := -s -w

SKILL_TEMPLATES_SRC := ../skills/hbrain/templates
EMBED_DIR := internal/render/templates
PLUGIN_BIN_DIR := ../bin

.PHONY: build install clean test cross prep plugin

# prep copies canonical templates from skills/hbrain/templates/ into the render
# package so go:embed can bundle them into the binary.
prep:
	@mkdir -p $(EMBED_DIR)
	@cp $(SKILL_TEMPLATES_SRC)/*.html $(EMBED_DIR)/

build: prep
	go build -ldflags "$(LDFLAGS)" -o brain ./cmd/brain/

install: prep
	go install -ldflags "$(LDFLAGS)" ./cmd/brain/

test: prep
	go test ./...

clean:
	rm -f brain
	rm -rf dist/
	rm -f $(EMBED_DIR)/*.html

cross: prep
	GOOS=darwin  GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o dist/brain-darwin-arm64 ./cmd/brain/
	GOOS=darwin  GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o dist/brain-darwin-amd64 ./cmd/brain/
	GOOS=linux   GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o dist/brain-linux-amd64  ./cmd/brain/
	GOOS=linux   GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o dist/brain-linux-arm64  ./cmd/brain/
	GOOS=windows GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o dist/brain-windows-amd64.exe ./cmd/brain/

# plugin stages all cross-compiled binaries into ../bin/ for the Claude Code
# plugin layout. ../bin/brain is a shim script that dispatches to the right
# brain-<os>-<arch> per host. The shim itself is hand-maintained — this
# target only refreshes the dispatched binaries.
plugin: cross
	@mkdir -p $(PLUGIN_BIN_DIR)
	@cp dist/brain-darwin-arm64     $(PLUGIN_BIN_DIR)/brain-darwin-arm64
	@cp dist/brain-darwin-amd64     $(PLUGIN_BIN_DIR)/brain-darwin-amd64
	@cp dist/brain-linux-amd64      $(PLUGIN_BIN_DIR)/brain-linux-amd64
	@cp dist/brain-linux-arm64      $(PLUGIN_BIN_DIR)/brain-linux-arm64
	@cp dist/brain-windows-amd64.exe $(PLUGIN_BIN_DIR)/brain-windows-amd64.exe
	@chmod +x $(PLUGIN_BIN_DIR)/brain-*
	@echo "staged $$(ls $(PLUGIN_BIN_DIR)/brain-* | wc -l | tr -d ' ') binaries in $(PLUGIN_BIN_DIR)"
