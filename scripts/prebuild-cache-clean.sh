#!/bin/bash
set -eu

# Clear Next.js cache in Vercel preview builds to avoid occasional webpack pack rename warnings.
# GitHub Actions uses its own cache layer via actions/cache, so we preserve .next/cache there.
# This allows the build to benefit from incremental compilation.

V_ENV="${VERCEL_ENV:-}"
IS_CI="${CI:-}"
IS_GITHUB_ACTIONS="${GITHUB_ACTIONS:-}"

# Only clear cache for Vercel preview deploys, not for GitHub Actions
if [ "$V_ENV" = "preview" ]; then
  echo "[prebuild] Clearing .next/cache for Vercel preview build (VERCEL_ENV=${V_ENV})"
  rm -rf .next/cache || true
elif [ "$IS_GITHUB_ACTIONS" = "true" ]; then
  echo "[prebuild] Preserving .next/cache for GitHub Actions (using actions/cache)"
elif [ "$IS_CI" = "true" ]; then
  # Other CI systems may still want cache cleared
  echo "[prebuild] Clearing .next/cache for CI build (CI=${IS_CI}, not GitHub Actions)"
  rm -rf .next/cache || true
else
  echo "[prebuild] Skipping cache clear (local dev)"
fi