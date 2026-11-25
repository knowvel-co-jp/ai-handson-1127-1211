FROM mcr.microsoft.com/devcontainers/javascript-node:22-bookworm

# Claude Code が PDF のページを読むときに使う pdftoppm（poppler-utils）
RUN apt-get update \
 && apt-get install -y --no-install-recommends poppler-utils \
 && rm -rf /var/lib/apt/lists/*
