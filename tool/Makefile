VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS := -s -w

SKILL_TEMPLATES_SRC := ../skill/templates
EMBED_DIR := internal/render/templates

.PHONY: build install clean test cross prep

# prep copies canonical templates from skill/templates/ into the render
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
