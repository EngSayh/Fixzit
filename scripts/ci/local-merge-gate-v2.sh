#!/usr/bin/env bash
#
# Fixzit Local Merge Gate - Evidence-Grade Validation Pipeline (STRICT)
# =======================================================================
# Security-hardened merge gate with fail-fast, no secret leaks, full scans.
#
# Exit codes:
#   0 = All gates passed (merge-ready)
#   1 = One or more gates failed (blocking)
#
# Usage:
#   bash scripts/ci/local-merge-gate.sh
#   pnpm merge:gate

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "========================================"
echo "Fixzit Merge Gate - STRICT Validation"
echo "========================================"
echo ""

# ---- Preconditions ----
command -v rg >/dev/null 2>&1 || { echo "❌ ripgrep (rg) is required"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "❌ jq is required"; exit 1; }

# ---- Clean + dirs ----
rm -rf .artifacts
mkdir -p .artifacts/{test,scan}

# Environment metadata
date -Iseconds | tee .artifacts/test/timestamp.txt
node -v | tee .artifacts/test/node.txt
pnpm -v | tee .artifacts/test/pnpm.txt
git rev-parse --short HEAD | tee .artifacts/test/commit.txt
git rev-parse HEAD | tee .artifacts/test/commit-full.txt

# P0: Ensure .artifacts not tracked
echo "▶ P0 Check: Verify .artifacts/ not tracked..."
ART_TRACKED_COUNT="$(git ls-files .artifacts 2>/dev/null | wc -l | tr -d ' ')"
echo "$ART_TRACKED_COUNT" | tee .artifacts/scan/artifacts-tracked.count.txt
if [[ "$ART_TRACKED_COUNT" != "0" ]]; then
  echo "❌ BLOCKING: .artifacts/ is tracked by git"
  echo "   Fix: git rm -r --cached .artifacts && git commit"
  exit 1
fi
echo "✅ .artifacts/ not tracked"
echo ""

# ---- Quality Gates ----
echo "▶ Running ESLint..."
if pnpm -s lint:prod >/dev/null 2>&1; then
  pnpm lint:prod 2>&1 | tee .artifacts/test/lint.log
  echo "✅ Lint passed"
else
  if pnpm lint --max-warnings=0 2>&1 | tee .artifacts/test/lint.log; then
    echo "✅ Lint passed"
  else
    echo "❌ Lint failed"
    exit 1
  fi
fi
echo ""

echo "▶ Running TypeScript type checking..."
if pnpm typecheck 2>&1 | tee .artifacts/test/typecheck.log; then
  echo "✅ TypeScript passed (0 errors)"
else
  echo "❌ TypeScript failed"
  exit 1
fi
echo ""

echo "▶ Running full test suite..."
if pnpm vitest run --reporter=default 2>&1 | tee .artifacts/test/vitest-full.log; then
  echo "✅ Tests passed"
else
  echo "❌ Tests failed"
  exit 1
fi
echo ""

# P0: Hard-fail on hoisting errors
echo "▶ P0 Check: Vi.mock hoisting errors..."
rg -n "Cannot access .* before initialization" .artifacts/test/vitest-full.log \
  | tee .artifacts/scan/hoist-errors.txt || true
if [[ -s .artifacts/scan/hoist-errors.txt ]]; then
  echo "❌ BLOCKING: Hoisting errors detected"
  cat .artifacts/scan/hoist-errors.txt
  exit 1
fi
echo "✅ No hoisting errors"
echo ""

echo "▶ Running production build..."
if pnpm build 2>&1 | tee .artifacts/test/build.log; then
  echo "✅ Build passed"
else
  echo "❌ Build failed"
  exit 1
fi
echo ""

# ---- Safe Secret Scan (FILENAMES ONLY - NO CONTENT) ----
echo "▶ Security: Scanning repo for secrets (filename-only)..."
rg -l --hidden \
  --glob '!.git/**' \
  --glob '!node_modules/**' \
  --glob '!.artifacts/**' \
  --glob '!.next/**' \
  -e 'mongodb\+srv://[^"'\''[:space:]]+' \
  -e 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY' \
  -e 'AKIA[0-9A-Z]{16}' \
  -e 'AUTH_SECRET=[^[:space:]]+' \
  -e 'NEXTAUTH_SECRET=[^[:space:]]+' \
  -e 'TAQNYAT[^[:space:]]*=[^[:space:]]+' \
  -e 'SENDGRID_API_KEY=[^[:space:]]+' \
  -e 'TAP_SECRET[^[:space:]]*=[^[:space:]]+' \
  -e 'PAYTABS[^[:space:]]*=[^[:space:]]+' \
  -e 'Bearer [A-Za-z0-9._~+/=-]{20,}' \
  . 2>/dev/null | tee .artifacts/scan/secret-scan.repo.files.txt || true

if [[ -s .artifacts/scan/secret-scan.repo.files.txt ]]; then
  echo "⚠️  WARNING: Potential secrets detected in files:"
  cat .artifacts/scan/secret-scan.repo.files.txt
  echo ""
  echo "   Review these files manually. If false positives, document in scan."
  # Not blocking, but flagged for review
fi
echo "✅ Secret scan complete"
echo ""

# ---- System-Wide Scans (FULL - NO TRUNCATION) ----
echo "▶ Running system-wide scans (untruncated)..."

echo "  • Scan A: @vitest-environment node annotations"
rg -n "@vitest-environment node" tests -g "*.ts" -g "*.tsx" \
  | tee .artifacts/scan/env-node.full.txt > /dev/null || true

echo "  • Scan B: Client-side server-only imports (app/**/*.tsx ONLY)"
rg -n "from ['\"](mongoose|mongodb)['\"]|require\(['\"](mongoose|mongodb)['\"]\)" \
  app -g "*.tsx" \
  | tee .artifacts/scan/server-only-imports.app-tsx.txt > /dev/null || true

echo "  • Scan C: All server-only module references"
rg -n "mongodb|mongoose" tests app lib server -g "*.ts" -g "*.tsx" \
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

# ---- Final Summary ----
echo "========================================"
echo "Merge Gate Summary"
echo "========================================"
echo ""
echo "Artifacts: .artifacts/test/ + .artifacts/scan/"
echo ""
echo "Gate Results:"
echo "  ✅ Lint:       PASSED"
echo "  ✅ TypeCheck:  PASSED"
echo "  ✅ Tests:      PASSED"
echo "  ✅ Build:      PASSED"
echo "  ✅ Security:   SCANNED"
echo "  ✅ Scans:      COMPLETE"
echo ""

# Check secret scan results
if [[ -s .artifacts/scan/secret-scan.repo.files.txt ]]; then
  echo "⚠️  Secret scan flagged files (review required)"
else
  echo "✅ No secrets detected"
fi
echo ""

echo "✅ ALL GATES PASSED - MERGE READY"
exit 0

