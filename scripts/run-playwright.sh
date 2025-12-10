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

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_HOST="127.0.0.1"
export HOSTNAME="$DEFAULT_HOST"
export PW_HOSTNAME="$DEFAULT_HOST"
export PW_USE_BUILD="false"
export PW_SKIP_BUILD="true"

# Prefer running against a built server to avoid dev-mode manifest gaps
# Default to dev-server mode unless PW_USE_BUILD is explicitly true to avoid build-time tracing/manifest issues.
if [[ "${PW_USE_BUILD:-false}" == "true" ]]; then
  if [[ "${PW_SKIP_BUILD:-false}" == "true" ]]; then
    echo "🔄 Skipping pnpm build (PW_SKIP_BUILD=true); using existing .next output"
  else
    # Ensure a clean build output to avoid stale traces/manifests breaking standalone builds
    rm -rf "$ROOT_DIR/.next" || true
    export NEXT_OUTPUT="${NEXT_OUTPUT:-standalone}"
    (cd "$ROOT_DIR" && pnpm build)
    # Temporary workaround for Next.js export rename of 500.html in some environments:
    # Pre-create the export 500 page if not generated to avoid ENOENT during rename.
    if [[ ! -f "$ROOT_DIR/.next/export/500.html" ]]; then
      mkdir -p "$ROOT_DIR/.next/export"
      echo "<html><body>500</body></html>" > "$ROOT_DIR/.next/export/500.html"
    fi
  fi

  # Relax instrumentation/env validation for Playwright runs
  export PLAYWRIGHT_TESTS="true"
  export SKIP_ENV_VALIDATION="${SKIP_ENV_VALIDATION:-true}"

  # Next.js with output: standalone cannot use `next start`.
  # Serve the standalone bundle directly and ensure static assets are present.
  STANDALONE_DIR="$ROOT_DIR/.next/standalone"
  STATIC_SRC="$ROOT_DIR/.next/static"
  STATIC_DEST="$STANDALONE_DIR/.next/static"
  mkdir -p "$(dirname "$STATIC_DEST")"
  if [[ -d "$STATIC_SRC" ]]; then
    rm -rf "$STATIC_DEST" || true
    cp -R "$STATIC_SRC" "$STATIC_DEST"
  fi

  # Use a non-standard default port to avoid conflicts with dev servers
  export PORT="${PORT:-3100}"
  export HOSTNAME="$DEFAULT_HOST"
  export PW_WEB_SERVER="cd \"$ROOT_DIR\" && HOSTNAME=$HOSTNAME PORT=$PORT node \"$STANDALONE_DIR/server.js\""
  export PW_WEB_URL="${PW_WEB_URL:-http://$HOSTNAME:$PORT}"
else
  export PORT="${PORT:-3100}"
  export HOSTNAME="$DEFAULT_HOST"
  export PW_WEB_SERVER="${PW_WEB_SERVER:-cd \"$ROOT_DIR\" && pnpm dev:webpack --hostname $HOSTNAME --port $PORT}"
fi

# Ensure Playwright-specific flags also set in dev-server mode
export PLAYWRIGHT_TESTS="${PLAYWRIGHT_TESTS:-true}"
export SKIP_ENV_VALIDATION="${SKIP_ENV_VALIDATION:-true}"

CONFIG_FILE="${PLAYWRIGHT_CONFIG:-tests/playwright.config.ts}"
CMD=("npx" "playwright" "test" "--config=${CONFIG_FILE}")
WORKERS_FLAG=("--workers=${PLAYWRIGHT_WORKERS:-1}")

if [ "$#" -gt 0 ]; then
  CMD+=("${WORKERS_FLAG[@]}" "$@")
else
  CMD+=("${WORKERS_FLAG[@]}")
fi

"${CMD[@]}"
