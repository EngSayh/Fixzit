#!/usr/bin/env bash
# Wrapper to run Playwright tests and always clean up artifacts
set -euo pipefail

# Allow explicit skip for environments without running app/DB
if [[ "${SKIP_PLAYWRIGHT:-false}" == "true" || "${PW_SKIP_E2E:-false}" == "true" ]]; then
  echo "Skipping Playwright E2E tests (SKIP_PLAYWRIGHT/PW_SKIP_E2E=true)."
  exit 0
fi

cleanup() {
  rm -rf tests/playwright-artifacts || true
}

trap cleanup EXIT

# Start with a clean slate as well
cleanup

# Prefer running against a built server to avoid dev-mode manifest gaps
if [[ "${PW_USE_BUILD:-true}" == "true" ]]; then
  pnpm build
  export PW_WEB_SERVER="pnpm start -- --hostname 0.0.0.0 --port 3000"
  export PW_WEB_URL="${PW_WEB_URL:-http://localhost:3000}"
else
  export PW_WEB_SERVER="${PW_WEB_SERVER:-pnpm dev:webpack -- --hostname 0.0.0.0 --port 3000}"
fi

CONFIG_FILE="${PLAYWRIGHT_CONFIG:-tests/playwright.config.ts}"
CMD=("npx" "playwright" "test" "--config=${CONFIG_FILE}")
WORKERS_FLAG=("--workers=${PLAYWRIGHT_WORKERS:-1}")

if [ "$#" -gt 0 ]; then
  CMD+=("${WORKERS_FLAG[@]}" "$@")
else
  CMD+=("${WORKERS_FLAG[@]}")
fi

"${CMD[@]}"
