#!/usr/bin/env bash
set -euo pipefail

# Clear Next.js cache in CI/preview builds to avoid occasional webpack pack rename warnings.
# Skips cache clean for local/dev builds to preserve speed.

V_ENV="${VERCEL_ENV:-}"
IS_CI="${CI:-}"

if { [ "$IS_CI" = "true" ] && [ "$V_ENV" != "production" ]; } || [ "$V_ENV" = "preview" ]; then
  echo "[prebuild] Clearing .next/cache for CI/preview build (VERCEL_ENV=${V_ENV:-unset})"
  rm -rf .next/cache || true
else
  echo "[prebuild] Skipping cache clear (CI=${IS_CI:-unset}, VERCEL_ENV=${V_ENV:-unset})"
fi
