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

# Ensure auth secrets exist for Auth.js JWT encoding in Playwright helpers
if [[ -z "${AUTH_SECRET:-}" ]]; then
  AUTH_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  echo "🔐 Generated ephemeral AUTH_SECRET for Playwright run."
fi
export AUTH_SECRET
export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-$AUTH_SECRET}"
export AUTH_SALT="${AUTH_SALT:-authjs.session-token}"

# Prefer running against a built server to avoid dev-mode manifest gaps
if [[ "${PW_USE_BUILD:-true}" == "true" ]]; then
  if [[ "${PW_SKIP_BUILD:-false}" == "true" ]]; then
    echo "🔄 Skipping pnpm build (PW_SKIP_BUILD=true); using existing .next output"
  else
    # Ensure a clean build output to avoid stale traces/manifests breaking standalone builds
    rm -rf .next || true
    pnpm build
    # Temporary workaround for Next.js export rename of 500.html in some environments:
    # Pre-create the export 500 page if not generated to avoid ENOENT during rename.
    if [[ ! -f ".next/export/500.html" ]]; then
      mkdir -p .next/export
      echo "<html><body>500</body></html>" > .next/export/500.html
    fi
  fi

  # Next.js with output: standalone cannot use `next start`.
  # Serve the standalone bundle directly and ensure static assets are present.
  STANDALONE_DIR=".next/standalone"
  STATIC_SRC=".next/static"
  STATIC_DEST="$STANDALONE_DIR/.next/static"
  mkdir -p "$(dirname "$STATIC_DEST")"
  if [[ -d "$STATIC_SRC" ]]; then
    rm -rf "$STATIC_DEST" || true
    cp -R "$STATIC_SRC" "$STATIC_DEST"
  fi

  export PORT="${PORT:-3000}"
  export HOSTNAME="${HOSTNAME:-0.0.0.0}"
  export PW_WEB_SERVER="PORT=$PORT HOSTNAME=$HOSTNAME node $STANDALONE_DIR/server.js"
  export PW_WEB_URL="${PW_WEB_URL:-http://localhost:$PORT}"
else
  export PW_WEB_SERVER="${PW_WEB_SERVER:-pnpm dev:webpack --hostname 0.0.0.0 --port 3000}"
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
