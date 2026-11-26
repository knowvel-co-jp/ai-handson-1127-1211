FROM mcr.microsoft.com/devcontainers/javascript-node:22-bookworm

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      poppler-utils poppler-data fonts-ipafont ripgrep \
      python3-pip python3-venv python-is-python3 \
 && rm -rf /var/lib/apt/lists/*

ENV PIP_BREAK_SYSTEM_PACKAGES=1
