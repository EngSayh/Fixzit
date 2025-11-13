#!/usr/bin/env bash
set -euo pipefail

echo "Phase-end: running verification & cleanup"

if command -v pnpm >/dev/null 2>&1; then
  PKG_MANAGER="pnpm"
else
  PKG_MANAGER="npm"
fi

echo "Running typecheck..."
${PKG_MANAGER} run -s typecheck

echo "Running lint (non-fatal)..."
${PKG_MANAGER} run -s lint || true

echo "Running tests (non-fatal)..."
${PKG_MANAGER} run -s test || true

echo "Archiving tmp/ to _artifacts/tmp if present"
mkdir -p _artifacts/tmp
if [ -d tmp ]; then
  # Move rather than copy to avoid leaving large files behind
  shopt -s dotglob || true
  mv tmp/* _artifacts/tmp/ 2>/dev/null || true
  # If tmp is empty now, remove it
  if [ -d tmp ] && [ -z "$(ls -A tmp)" ]; then
    rmdir tmp || true
  fi
fi

echo "Phase-end complete."
