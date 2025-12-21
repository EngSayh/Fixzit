#!/bin/bash
# scripts/repo-sanity-check.sh
# Preflight check to prevent common repo-state issues before QA gate runs
# Part of qa:preflight pipeline

set -eo pipefail

echo "🔍 Running repo sanity checks..."

# Check 1: Fail if any tracked files are deleted in the working tree
echo "  Checking for deleted tracked files..."
if git status --porcelain 2>/dev/null | grep -q "^ D"; then
  DELETED_COUNT=$(git status --porcelain 2>/dev/null | grep -c "^ D")
  echo "❌ ERROR: $DELETED_COUNT tracked files are deleted locally."
  echo "   Restore with: git checkout HEAD -- <path>"
  echo "   Deleted files:"
  git status --porcelain | grep "^ D" | head -20
  exit 1
fi
echo "  ✓ No deleted tracked files"

# Check 2: Warn about unstaged changes (but don't fail)
UNSTAGED=$(git status --porcelain 2>/dev/null | grep "^ M\|^??" | wc -l | tr -d ' ')
if [ "$UNSTAGED" -gt 0 ]; then
  echo "  ⚠ Warning: $UNSTAGED unstaged/untracked files present"
fi

# Check 3: Ensure no stray Next.js processes that could interfere with build
echo "  Checking for conflicting Next.js processes..."
if pgrep -f "next dev" > /dev/null 2>&1; then
  echo "  ⚠ Warning: 'next dev' process running - may cause build conflicts"
  echo "   Consider: pkill -f 'next dev' before running qa:gate"
fi

# Check 4: Verify tests/ directory exists and has files
echo "  Checking tests/ directory..."
TEST_COUNT=$(find tests -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l | tr -d ' ')
if [ "$TEST_COUNT" -lt 100 ]; then
  echo "❌ ERROR: Only $TEST_COUNT test files found (expected 100+)"
  echo "   This may indicate accidentally deleted tests."
  exit 1
fi
echo "  ✓ Found $TEST_COUNT test files"

# Check 5: Verify .next is clean or doesn't exist
if [ -d ".next" ] && [ -f ".next/BUILD_ID" ]; then
  BUILD_AGE=$(($(date +%s) - $(stat -f %m .next/BUILD_ID 2>/dev/null || stat -c %Y .next/BUILD_ID 2>/dev/null)))
  if [ "$BUILD_AGE" -gt 86400 ]; then
    echo "  ⚠ Warning: .next build is over 24 hours old - consider: rm -rf .next"
  fi
fi

echo "✅ Repo sanity checks passed"
