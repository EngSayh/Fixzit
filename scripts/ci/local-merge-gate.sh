#!/usr/bin/env bash
#
# Fixzit Local Merge Gate - Evidence-Grade Validation Pipeline
# ============================================================
# Runs all quality gates and generates untruncated evidence artifacts.
# All artifacts are written to .artifacts/ (git-ignored, local only).
#
# Exit codes:
#   0 = All gates passed (merge-ready)
#   1 = One or more gates failed (blocking)
#
# Usage:
#   bash scripts/ci/local-merge-gate.sh
#   pnpm merge:gate  (if added to package.json)

set -euo pipefail

echo "========================================"
echo "Fixzit Merge Gate - Evidence Collection"
echo "========================================"
echo ""

# Clean slate
rm -rf .artifacts
mkdir -p .artifacts/{test,scan}

# Environment metadata
echo "▶ Capturing environment metadata..."
node -v | tee .artifacts/test/node.txt
pnpm -v | tee .artifacts/test/pnpm.txt
git rev-parse --short HEAD | tee .artifacts/test/commit.txt
git rev-parse HEAD | tee .artifacts/test/commit-full.txt
date +"%Y-%m-%dT%H:%M:%S%z" | tee .artifacts/test/timestamp.txt
echo ""

# Lint
echo "▶ Running ESLint (max-warnings=0)..."
if pnpm lint --max-warnings=0 2>&1 | tee .artifacts/test/lint.log; then
  echo "✅ Lint passed"
else
  echo "❌ Lint failed"
  exit 1
fi
echo ""

# TypeScript
echo "▶ Running TypeScript type checking..."
if pnpm typecheck 2>&1 | tee .artifacts/test/typecheck.log; then
  echo "✅ TypeScript passed (0 errors)"
else
  echo "❌ TypeScript failed"
  exit 1
fi
echo ""

# Tests (full suite)
echo "▶ Running full test suite (unfiltered output)..."
if pnpm vitest run --reporter=default 2>&1 | tee .artifacts/test/vitest-full.log; then
  echo "✅ Tests passed"
else
  echo "❌ Tests failed"
  exit 1
fi
echo ""

# Tests (JSON output for machine parsing)
echo "▶ Generating JSON test report..."
pnpm vitest run --reporter=json --outputFile .artifacts/test/vitest-full.json 2>&1 | tee .artifacts/test/vitest-json.log || true
if [ -f .artifacts/test/vitest-full.json ]; then
  # Extract summary
  jq '{numFailedTestSuites, numFailedTests, numPassedTests, numTotalTests, success}' \
    .artifacts/test/vitest-full.json > .artifacts/test/vitest-summary.json
  echo "✅ JSON report generated"
else
  echo "⚠️  JSON report generation failed (non-blocking)"
fi
echo ""

# Build verification
echo "▶ Running production build verification..."
if pnpm build 2>&1 | tee .artifacts/test/build.log; then
  echo "✅ Build passed"
else
  echo "❌ Build failed"
  exit 1
fi
echo ""

# System-wide scans (FULL - NO TRUNCATION)
echo "▶ Running system-wide scans (untruncated)..."

echo "  • Scan A: @vitest-environment node annotations"
rg -n "@vitest-environment node" tests -g "*.ts" -g "*.tsx" \
  | tee .artifacts/scan/env-node.full.txt > /dev/null || true

echo "  • Scan B: Server-only module imports (mongoose/bullmq/ioredis/mongodb)"
rg -n "bullmq|ioredis|mongodb|mongoose" tests app lib server -g "*.ts" -g "*.tsx" \
  | tee .artifacts/scan/server-only-imports.full.txt > /dev/null || true

echo "  • Scan C: Dynamic imports in tests"
rg -n "await import\(|\bimport\(" tests -g "*.ts" -g "*.tsx" \
  | tee .artifacts/scan/dynamic-imports-tests.full.txt > /dev/null || true

echo "  • Scan D: App route imports in tests (brittle pattern)"
rg -n 'from ["\x27](\.\./\.\./)?app/|from ["\x27]@/app/' tests -g "*.ts" -g "*.tsx" \
  | tee .artifacts/scan/test-imports-app-pages.full.txt > /dev/null || true

echo "  • Scan E: Mock patterns (vi.mock/doMock/hoisted)"
rg -n 'vi\.mock\(|vi\.doMock\(|vi\.hoisted\(' tests -g "*.ts" -g "*.tsx" \
  | tee .artifacts/scan/mocks.full.txt > /dev/null || true

echo "  • Scan F: Hoisting errors (vi.mock violations)"
rg -n "Cannot access .* before initialization" .artifacts/test/vitest-full.log \
  | tee .artifacts/scan/hoist-errors.txt > /dev/null || echo "0" > .artifacts/scan/hoist-errors.txt

# Generate counts
wc -l .artifacts/scan/*.full.txt .artifacts/scan/hoist-errors.txt \
  | tee .artifacts/scan/counts.txt > /dev/null

echo "✅ Scans complete"
echo ""

# Final summary
echo "========================================"
echo "Merge Gate Summary"
echo "========================================"
echo ""
echo "Artifacts Location: .artifacts/"
echo "  - Tests:  .artifacts/test/vitest-full.log"
echo "  - JSON:   .artifacts/test/vitest-full.json"
echo "  - Build:  .artifacts/test/build.log"
echo "  - Scans:  .artifacts/scan/*.full.txt"
echo ""

# Check if JSON success field is true
if [ -f .artifacts/test/vitest-full.json ]; then
  SUCCESS=$(jq -r '.success' .artifacts/test/vitest-full.json)
  if [ "$SUCCESS" = "true" ]; then
    echo "✅ ALL GATES PASSED - MERGE READY"
    exit 0
  else
    echo "❌ TESTS FAILED - BLOCKING MERGE"
    exit 1
  fi
else
  echo "⚠️  Could not verify test success (JSON missing)"
  exit 1
fi
