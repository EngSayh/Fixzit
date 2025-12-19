#!/usr/bin/env bash
#
# Fixzit Local Merge Gate - Evidence-Grade Validation Pipeline
# ============================================================
# Runs all quality gates and generates untruncated evidence artifacts.
# All artifacts are written to .artifacts/ (git-ignored, local only).
#
# STRICT MODE: Fails fast on any gate failure
# SECURITY: Never prints secret matches (filename-only scanning)
#
# Exit codes:
#   0 = All gates passed (merge-ready)
#   1 = One or more gates failed (blocking)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# ---- Preconditions ----
command -v rg >/dev/null 2>&1 || { echo "❌ ripgrep (rg) is required"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "⚠️  jq not found - JSON summary will be skipped"; }

echo "========================================"
echo "Fixzit Merge Gate - Evidence Collection"
echo "========================================"
echo ""

# ---- Clean + dirs ----
rm -rf .artifacts
mkdir -p .artifacts/{test,scan}

# Environment metadata
echo "▶ Capturing environment metadata..."
date -Iseconds | tee .artifacts/test/timestamp.txt
node -v | tee .artifacts/test/node.txt
pnpm -v | tee .artifacts/test/pnpm.txt
git rev-parse --short HEAD | tee .artifacts/test/commit.txt
git rev-parse HEAD | tee .artifacts/test/commit-full.txt
echo ""

# Ensure .artifacts not tracked
echo "▶ Verifying .artifacts/ is not git-tracked..."
ART_TRACKED_COUNT="$(git ls-files .artifacts 2>/dev/null | wc -l | tr -d ' ')"
echo "$ART_TRACKED_COUNT" | tee .artifacts/scan/artifacts-tracked.count.txt
if [[ "$ART_TRACKED_COUNT" != "0" ]]; then
  echo "❌ .artifacts is tracked by git. Run: git rm -r --cached .artifacts"
  exit 1
fi
echo "✅ .artifacts/ is not tracked"
echo ""

# ---- Quality Gates ----

# Lint
echo "▶ Running ESLint (max-warnings=0)..."
if pnpm -s lint:prod >/dev/null 2>&1; then
  if pnpm lint:prod 2>&1 | tee .artifacts/test/lint.log; then
    echo "✅ Lint passed"
  else
    echo "❌ Lint failed"
    exit 1
  fi
else
  if pnpm lint --max-warnings=0 2>&1 | tee .artifacts/test/lint.log; then
    echo "✅ Lint passed"
  else
    echo "❌ Lint failed"
    exit 1
  fi
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

# Tests
echo "▶ Running full test suite (unfiltered output)..."
if pnpm vitest run --reporter=default 2>&1 | tee .artifacts/test/vitest-full.log; then
  echo "✅ Tests passed"
else
  echo "❌ Tests failed"
  exit 1
fi
echo ""

# Hard-fail on hoisting errors
echo "▶ Checking for vi.mock hoisting errors..."
rg -n "Cannot access .* before initialization" .artifacts/test/vitest-full.log \
  | tee .artifacts/scan/hoist-errors.txt || true
if [[ -s .artifacts/scan/hoist-errors.txt ]]; then
  echo "❌ Hoisting errors detected. Fix vi.mock factory hoisting."
  exit 1
fi
echo "✅ No hoisting errors"
echo ""

# Build
echo "▶ Running production build verification..."
if pnpm build 2>&1 | tee .artifacts/test/build.log; then
  echo "✅ Build passed"
else
  echo "❌ Build failed"
  exit 1
fi
echo ""

# ---- Security Scans (SAFE - filename-only) ----
echo "▶ Running security scans (filename-only, no secret printing)..."

echo "  • Secret scan (repo-wide, filename-only)"
rg -l --hidden --glob '!.git/**' --glob '!node_modules/**' --glob '!.artifacts/**' \
  -e 'mongodb\+srv://|BEGIN PRIVATE KEY|AKIA[0-9A-Z]{16}|AUTH_SECRET|NEXTAUTH_SECRET|TAQNYAT|SENDGRID|TAP_SECRET|PAYTABS|Bearer\s+[A-Za-z0-9._~+/=-]{20,}' \
  . 2>/dev/null | tee .artifacts/scan/secret-scan.repo.files.txt || true

if [[ -s .artifacts/scan/secret-scan.repo.files.txt ]]; then
  echo "⚠️  WARNING: Potential secrets detected in tracked files:"
  cat .artifacts/scan/secret-scan.repo.files.txt
  echo "Review .artifacts/scan/secret-scan.repo.files.txt before pushing"
else
  echo "✅ No secrets detected"
fi
echo ""

# ---- System-Wide Scans (FULL - NO TRUNCATION) ----
echo "▶ Running system-wide scans (untruncated)..."

echo "  • Scan A: @vitest-environment node annotations"
rg -n "@vitest-environment node" tests -g "*.ts" -g "*.tsx" \
  | tee .artifacts/scan/env-node.full.txt > /dev/null || true

echo "  • Scan B: Server-only imports in app/**.tsx (client leak check)"
rg -n "from ['\"](mongoose|mongodb|bullmq|ioredis)['\"]|require\(['\"](mongoose|mongodb|bullmq|ioredis)['\"]\)" app -g "*.tsx" \
  | tee .artifacts/scan/server-only-imports.app-tsx.txt > /dev/null || true

echo "  • Scan C: Server-only imports (full - all locations)"
rg -n "bullmq|ioredis|mongodb|mongoose" tests app lib server -g "*.ts" -g "*.tsx" \
  | tee .artifacts/scan/server-only-imports.full.txt > /dev/null || true

echo "  • Scan D: Dynamic imports in tests"
rg -n "\bimport\(" tests -g "*.ts" -g "*.tsx" \
  | tee .artifacts/scan/dynamic-imports-tests.full.txt > /dev/null || true

echo "  • Scan E: App route imports in tests (brittle pattern)"
rg -n 'from ["\x27](\.\./\.\./)?app/|from ["\x27]@/app/' tests -g "*.ts" -g "*.tsx" \
  | tee .artifacts/scan/test-imports-app-pages.full.txt > /dev/null || true

echo "  • Scan F: Mock patterns (vi.mock/doMock/hoisted)"
rg -n 'vi\.mock\(|vi\.doMock\(|vi\.hoisted\(' tests -g "*.ts" -g "*.tsx" \
  | tee .artifacts/scan/mocks.full.txt > /dev/null || true

# Generate counts
wc -l .artifacts/scan/*.txt 2>/dev/null | tee .artifacts/scan/counts.txt > /dev/null || true

echo "✅ Scans complete"
echo ""

# ---- JSON Summary (if jq available) ----
if command -v jq >/dev/null 2>&1; then
  echo "▶ Generating JSON test report..."
  pnpm vitest run --reporter=json --outputFile .artifacts/test/vitest-full.json 2>&1 | tee .artifacts/test/vitest-json.log || true
  if [ -f .artifacts/test/vitest-full.json ]; then
    jq '{numFailedTestSuites, numFailedTests, numPassedTests, numTotalTests, success}' \
      .artifacts/test/vitest-full.json > .artifacts/test/vitest-summary.json
    echo "✅ JSON report generated"
  fi
  echo ""
fi

# ---- Final Summary ----
echo "========================================"
echo "Merge Gate Summary"
echo "========================================"
echo ""
echo "Artifacts Location: .artifacts/"
echo "  - Tests:   .artifacts/test/vitest-full.log"
echo "  - JSON:    .artifacts/test/vitest-full.json"
echo "  - Build:   .artifacts/test/build.log"
echo "  - Scans:   .artifacts/scan/*.txt"
echo "  - Counts:  .artifacts/scan/counts.txt"
echo ""

# Final verdict
if [ -f .artifacts/test/vitest-summary.json ] && command -v jq >/dev/null 2>&1; then
  SUCCESS=$(jq -r '.success' .artifacts/test/vitest-summary.json)
  if [ "$SUCCESS" = "true" ]; then
    echo "✅ ALL GATES PASSED - MERGE READY"
    exit 0
  else
    echo "❌ TESTS FAILED - BLOCKING MERGE"
    exit 1
  fi
else
  # Fallback: check exit code from test run
  echo "✅ ALL GATES PASSED - MERGE READY"
  exit 0
fi

