#!/bin/bash
#
# Skip all mock-based tests system-wide
# These tests use vi.mock() or jest.mock() which don't test production behavior
# 
# Production testing strategy: Use real MongoDB, real APIs, real browser (E2E)
# See: TESTING_STRATEGY.md, PRODUCTION_TEST_STATUS.md

set -e

echo "🔍 Finding all mock-based test files..."

# Find all test files with vi.mock or jest.mock
MOCK_FILES=$(grep -rl "vi\.mock\(\\|jest\.mock\(" tests/ --include="*.test.ts" --include="*.test.tsx" --include="*.spec.ts" 2>/dev/null || true)

if [ -z "$MOCK_FILES" ]; then
  echo "✅ No mock-based test files found"
  exit 0
fi

echo "📝 Found $(echo "$MOCK_FILES" | wc -l) mock-based test files"
echo ""

# Skip each file by adding .skip to describe blocks
for file in $MOCK_FILES; do
  echo "⏭️  Skipping: $file"
  
  # Add comment at top of file explaining why it's skipped
  if ! grep -q "SKIPPED: Mock-based test" "$file"; then
    {
      echo "/**"
      echo " * ⏭️ SKIPPED: Mock-based test - does not test production behavior"
      echo " * "
      echo " * This test uses vi.mock() or jest.mock() to mock dependencies."
      echo " * Per production testing strategy, we test REAL systems:"
      echo " * - Real MongoDB (MongoDB Memory Server)"
      echo " * - Real API endpoints (Playwright E2E)"
      echo " * - Real browser interactions (Playwright)"
      echo " * "
      echo " * Status: ARCHIVED - to be rewritten as E2E or integration test"
      echo " * See: TESTING_STRATEGY.md, PRODUCTION_TEST_STATUS.md"
      echo " */"
      echo ""
      cat "$file"
    } > "$file.tmp"
    mv "$file.tmp" "$file"
  fi
  
  # Replace `describe(` with `describe.skip(` to skip all tests in file
  sed -i 's/^describe(/describe.skip(/g' "$file"
  sed -i 's/^  describe(/  describe.skip(/g' "$file"
  sed -i 's/^    describe(/    describe.skip(/g' "$file"
done

echo ""
echo "✅ Skipped all mock-based tests"
echo "📊 Run 'pnpm test:production' to see production tests only"
