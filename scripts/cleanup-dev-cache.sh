#!/bin/bash
# ============================================================================
# Cleanup Development Cache - Prevents Exit Code 5 (OOM) crashes
# ============================================================================
# Root Cause: .next/cache grows to 3GB+, TypeScript cache, Extension Host leaks
# Solution: Aggressive cleanup of dev artifacts before they cause memory exhaustion
# Run: bash scripts/cleanup-dev-cache.sh
# Or add to package.json: "predev": "bash scripts/cleanup-dev-cache.sh"
# ============================================================================

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "🧹 Cleaning development caches to prevent OOM..."

# 1. Clean Next.js cache (biggest culprit - can reach 3GB+)
if [ -d ".next/cache" ]; then
  SIZE_BEFORE=$(du -sh .next/cache 2>/dev/null | cut -f1 || echo "0")
  rm -rf .next/cache
  echo "✅ Removed .next/cache ($SIZE_BEFORE)"
else
  echo "✓ .next/cache already clean"
fi

# 2. Clean TypeScript build info
if [ -f "tsconfig.tsbuildinfo" ]; then
  rm -f tsconfig.tsbuildinfo
  echo "✅ Removed tsconfig.tsbuildinfo"
fi

# 3. Clean Turbopack cache
if [ -d ".turbo" ]; then
  rm -rf .turbo
  echo "✅ Removed .turbo cache"
fi

# 4. Clean test coverage artifacts
if [ -d "coverage" ]; then
  rm -rf coverage
  echo "✅ Removed coverage/"
fi

# 5. Clean Playwright artifacts
if [ -d "test-results" ]; then
  rm -rf test-results
  echo "✅ Removed test-results/"
fi

# 6. Clean VSCode TypeScript temp files
if [ -d "/tmp/vscode-typescript1000" ]; then
  rm -rf /tmp/vscode-typescript1000
  echo "✅ Removed VSCode TypeScript temp files"
fi

# 7. Memory status
echo ""
echo "💾 Memory Status:"
free -h | grep "Mem:" || echo "Memory info unavailable"

echo ""
echo "✅ Cache cleanup complete! Safe to run 'pnpm dev'"
