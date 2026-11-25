FROM mcr.microsoft.com/devcontainers/javascript-node:22-bookworm

# Claude Code が PDF を読むときに使う pdftoppm・pdftotext（poppler-utils）と、
# Python のライブラリを入れる pip（python3 は元のイメージにある。python でも呼べるようにする）
RUN apt-get update \
 && apt-get install -y --no-install-recommends poppler-utils python3-pip python3-venv python-is-python3 \
 && rm -rf /var/lib/apt/lists/*

# Debian は pip install をそのままでは止める（externally-managed-environment）。
# このコンテナは授業専用なので、止めずにユーザーのフォルダーへ入れる。
ENV PIP_BREAK_SYSTEM_PACKAGES=1
