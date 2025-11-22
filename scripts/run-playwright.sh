#!/usr/bin/env bash
# Wrapper to run Playwright tests and always clean up artifacts
set -euo pipefail

cleanup() {
  rm -rf tests/playwright-artifacts || true
}

trap cleanup EXIT

# Start with a clean slate as well
cleanup

CONFIG_FILE="${PLAYWRIGHT_CONFIG:-tests/playwright.config.ts}"
CMD=("npx" "playwright" "test" "--config=${CONFIG_FILE}")
WORKERS_FLAG=("--workers=${PLAYWRIGHT_WORKERS:-1}")

if [ "$#" -gt 0 ]; then
  CMD+=("${WORKERS_FLAG[@]}" "$@")
else
  CMD+=("${WORKERS_FLAG[@]}")
fi

"${CMD[@]}"
