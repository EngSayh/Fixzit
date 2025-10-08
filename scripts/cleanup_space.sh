#!/usr/bin/env bash
set -euo pipefail

# Disk Cleanup Script - Enforce ≥60% free space
# Run before heavy operations to prevent stalls and timeouts

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧹 Fixzit Disk Cleanup (Target: ≥60% free)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📊 BEFORE Cleanup:"
df -h .
echo ""

# Remove build artifacts
echo "🗑️  Removing build artifacts..."
rm -rf .next/* || true
rm -rf test-results/* || true
rm -rf playwright-report/* || true
rm -rf coverage/* || true
rm -rf dist/* || true
rm -rf build/* || true
echo "✅ Build artifacts removed"

# Clean package manager caches
echo ""
echo "🗑️  Cleaning package manager caches..."
npm cache clean --force 2>/dev/null || true
yarn cache clean 2>/dev/null || true
pnpm store prune 2>/dev/null || true
echo "✅ Package caches cleaned"

# Remove log and temp files
echo ""
echo "🗑️  Removing log and temp files..."
find . -type f \( -name "*.log" -o -name "*.tmp" -o -name "*.tsbuildinfo" \) -delete || true
echo "✅ Log and temp files removed"

# Git housekeeping
echo ""
echo "🗑️  Git housekeeping..."
git gc --aggressive --prune=now 2>/dev/null || true
git lfs prune 2>/dev/null || true
echo "✅ Git optimized"

# Playwright browser cleanup (keep only chromium for E2E)
echo ""
echo "🗑️  Playwright browser cleanup..."
npx playwright uninstall --all 2>/dev/null || true
echo "✅ Browsers uninstalled (will reinstall chromium on demand)"

# Docker cleanup (if docker is available)
if command -v docker &> /dev/null; then
  echo ""
  echo "🗑️  Docker cleanup..."
  docker system prune -af 2>/dev/null || true
  docker volume prune -f 2>/dev/null || true
  echo "✅ Docker cleaned"
fi

echo ""
echo "📊 AFTER Cleanup:"
df -h .
echo ""

# Calculate free space percentage
PCT_USED=$(df -P . | awk 'NR==2 {print $5}' | tr -d '%')
PCT_FREE=$((100 - PCT_USED))

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$PCT_FREE" -ge 60 ]; then
  echo "✅ SUCCESS: ${PCT_FREE}% free space (Target: ≥60%)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
else
  echo "⚠️  WARNING: Only ${PCT_FREE}% free (Target: ≥60%)"
  echo ""
  echo "Top 20 largest directories:"
  du -sh */ 2>/dev/null | sort -rh | head -20 || true
  echo ""
  echo "Consider manual investigation with:"
  echo "  du -sh * | sort -rh | head -40"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
