VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS := -s -w

.PHONY: build install clean test cross

build:
	go build -ldflags "$(LDFLAGS)" -o brain ./cmd/brain/

install:
	go install -ldflags "$(LDFLAGS)" ./cmd/brain/

test:
	go test ./...

clean:
	rm -f brain
	rm -rf dist/

cross:
	GOOS=darwin  GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o dist/brain-darwin-arm64 ./cmd/brain/
	GOOS=darwin  GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o dist/brain-darwin-amd64 ./cmd/brain/
	GOOS=linux   GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o dist/brain-linux-amd64  ./cmd/brain/
	GOOS=linux   GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o dist/brain-linux-arm64  ./cmd/brain/
	GOOS=windows GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o dist/brain-windows-amd64.exe ./cmd/brain/
