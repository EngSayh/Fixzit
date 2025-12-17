#!/usr/bin/env bash
# Fixzit Workspace Audit Pipeline
# Comprehensive validation gate for merge-readiness
# Author: Eng. Sultan Al Hassni
# Usage: pnpm audit:workspace

set -euo pipefail

OUT="artifacts/audit/latest"
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
SCAN_DIR="artifacts/audit/$TIMESTAMP/scans"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Fixzit Workspace Audit Pipeline"
echo "📅 Timestamp: $TIMESTAMP"
echo "📁 Output: $OUT"
echo ""

# Clean and create directories
rm -rf "$OUT"
mkdir -p "$OUT" "$SCAN_DIR"

# ============================================================================
# 1. VITEST (CRITICAL - Must be 100% green)
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Running Vitest..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if pnpm vitest run --reporter=json --outputFile "$OUT/vitest.json" 2>&1 | tee "$OUT/vitest.log"; then
  echo -e "${GREEN}✅ Vitest execution completed${NC}"
else
  echo -e "${RED}❌ Vitest execution failed${NC}"
fi

# Extract metrics
cat "$OUT/vitest.json" | jq '{
  success,
  numFailedTestSuites,
  numFailedTests,
  numPendingTests,
  numPassedTests,
  numTotalTests,
  testResults: [.testResults[] | {
    name,
    status,
    duration: .endTime
  }]
}' | tee "$OUT/vitest.summary.json"

# Check for failures
VITEST_SUCCESS=$(cat "$OUT/vitest.json" | jq '.success')
FAILED_SUITES=$(cat "$OUT/vitest.json" | jq '.numFailedTestSuites')
FAILED_TESTS=$(cat "$OUT/vitest.json" | jq '.numFailedTests')
PENDING_TESTS=$(cat "$OUT/vitest.json" | jq '.numPendingTests')

echo ""
if [ "$VITEST_SUCCESS" = "true" ] && [ "$FAILED_SUITES" = "0" ] && [ "$FAILED_TESTS" = "0" ]; then
  echo -e "${GREEN}✅ Vitest: ALL TESTS PASSING${NC}"
else
  echo -e "${RED}❌ Vitest: FAILURES DETECTED${NC}"
  echo "   Failed suites: $FAILED_SUITES"
  echo "   Failed tests: $FAILED_TESTS"
  echo "   Pending tests: $PENDING_TESTS"
fi

# ============================================================================
# 2. TYPECHECK (CRITICAL - Must be 0 errors)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📘 Running TypeScript typecheck..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if pnpm typecheck 2>&1 | tee "$OUT/typecheck.log"; then
  echo -e "${GREEN}✅ TypeCheck: PASS (0 errors)${NC}"
  TYPECHECK_PASS=true
else
  echo -e "${RED}❌ TypeCheck: FAIL${NC}"
  TYPECHECK_PASS=false
fi

# ============================================================================
# 3. ESLINT (CRITICAL - Must be 0 errors, 0 warnings)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Running ESLint..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if pnpm lint --max-warnings=0 2>&1 | tee "$OUT/lint.log"; then
  echo -e "${GREEN}✅ ESLint: PASS (0 errors, 0 warnings)${NC}"
  LINT_PASS=true
else
  echo -e "${RED}❌ ESLint: FAIL${NC}"
  LINT_PASS=false
fi

# ============================================================================
# 4. CODE QUALITY SCANS (CRITICAL - Must be 0 skipped tests)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔎 Running Code Quality Scans..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Scan: Skipped/Only/Todo tests
echo "📊 Scanning for skipped/only/todo tests..."
if rg -n --hidden --glob '!node_modules/**' --glob '!.next/**' \
  '\b(it|test|describe)\.skip\b|\b(it|test|describe)\.only\b|\btest\.todo\b' \
  tests > "$SCAN_DIR/skipped_tests.log" 2>&1; then
  SKIP_COUNT=$(wc -l < "$SCAN_DIR/skipped_tests.log" | tr -d ' ')
  echo -e "${YELLOW}⚠️  Found $SKIP_COUNT skipped/only/todo tests${NC}"
  head -20 "$SCAN_DIR/skipped_tests.log"
else
  echo -e "${GREEN}✅ No skipped/only/todo tests found${NC}"
  SKIP_COUNT=0
fi

# Scan: SSRF-vulnerable URL fields
echo ""
echo "🔒 Scanning for SSRF-vulnerable URL fields..."
if rg -n --hidden --glob '!node_modules/**' --glob '!.next/**' --glob '!artifacts/**' \
  'z\.string\(\)\.url\(\)|logoUrl|imageUrl|avatarUrl|webhookUrl|callbackUrl|redirectUrl|faviconUrl' \
  app lib services > "$SCAN_DIR/ssrf_surface.log" 2>&1; then
  SSRF_COUNT=$(wc -l < "$SCAN_DIR/ssrf_surface.log" | tr -d ' ')
  echo -e "${YELLOW}⚠️  Found $SSRF_COUNT potential SSRF surface points${NC}"
  echo "   Review: $SCAN_DIR/ssrf_surface.log"
else
  echo -e "${GREEN}✅ No URL fields found${NC}"
  SSRF_COUNT=0
fi

# Scan: Hardcoded logo references
echo ""
echo "🖼️  Scanning for hardcoded logo references..."
if rg -n --hidden --glob '!node_modules/**' --glob '!.next/**' \
  '(/logo|fixzit-logo|favicon\.ico|logo\.(png|svg|jpg|webp))' \
  app components lib > "$SCAN_DIR/hardcoded_logos.log" 2>&1; then
  LOGO_COUNT=$(wc -l < "$SCAN_DIR/hardcoded_logos.log" | tr -d ' ')
  echo -e "${YELLOW}⚠️  Found $LOGO_COUNT hardcoded logo references${NC}"
  echo "   Review: $SCAN_DIR/hardcoded_logos.log"
else
  echo -e "${GREEN}✅ No hardcoded logo references found${NC}"
  LOGO_COUNT=0
fi

# Scan: console.log/console.error in production code
echo ""
echo "📝 Scanning for console statements..."
if rg -n --hidden --glob '!node_modules/**' --glob '!.next/**' --glob '!tests/**' \
  'console\.(log|error|warn|debug)\(' \
  app components lib services > "$SCAN_DIR/console_statements.log" 2>&1; then
  CONSOLE_COUNT=$(wc -l < "$SCAN_DIR/console_statements.log" | tr -d ' ')
  echo -e "${YELLOW}⚠️  Found $CONSOLE_COUNT console statements${NC}"
  echo "   Review: $SCAN_DIR/console_statements.log"
else
  echo -e "${GREEN}✅ No console statements found${NC}"
  CONSOLE_COUNT=0
fi

# ============================================================================
# 5. SUMMARY & GATE CHECK
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 AUDIT SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create summary JSON
cat > "$OUT/summary.json" << EOF
{
  "timestamp": "$TIMESTAMP",
  "vitest": {
    "success": $VITEST_SUCCESS,
    "failedSuites": $FAILED_SUITES,
    "failedTests": $FAILED_TESTS,
    "pendingTests": $PENDING_TESTS
  },
  "typecheck": {
    "pass": $TYPECHECK_PASS
  },
  "lint": {
    "pass": $LINT_PASS
  },
  "scans": {
    "skippedTests": $SKIP_COUNT,
    "ssrfSurface": $SSRF_COUNT,
    "hardcodedLogos": $LOGO_COUNT,
    "consoleStatements": $CONSOLE_COUNT
  }
}
EOF

# Print summary
echo ""
echo "Core Quality Gates:"
if [ "$VITEST_SUCCESS" = "true" ] && [ "$FAILED_SUITES" = "0" ] && [ "$FAILED_TESTS" = "0" ]; then
  echo -e "  ${GREEN}✅ Vitest: PASS${NC}"
else
  echo -e "  ${RED}❌ Vitest: FAIL${NC}"
fi

if [ "$TYPECHECK_PASS" = true ]; then
  echo -e "  ${GREEN}✅ TypeCheck: PASS${NC}"
else
  echo -e "  ${RED}❌ TypeCheck: FAIL${NC}"
fi

if [ "$LINT_PASS" = true ]; then
  echo -e "  ${GREEN}✅ ESLint: PASS${NC}"
else
  echo -e "  ${RED}❌ ESLint: FAIL${NC}"
fi

echo ""
echo "Code Quality Scans:"
if [ "$SKIP_COUNT" -eq 0 ]; then
  echo -e "  ${GREEN}✅ Skipped Tests: 0${NC}"
else
  echo -e "  ${YELLOW}⚠️  Skipped Tests: $SKIP_COUNT${NC}"
fi

if [ "$SSRF_COUNT" -gt 0 ]; then
  echo -e "  ${YELLOW}⚠️  SSRF Surface: $SSRF_COUNT points${NC}"
fi

if [ "$LOGO_COUNT" -gt 0 ]; then
  echo -e "  ${YELLOW}⚠️  Hardcoded Logos: $LOGO_COUNT references${NC}"
fi

if [ "$CONSOLE_COUNT" -gt 0 ]; then
  echo -e "  ${YELLOW}⚠️  Console Statements: $CONSOLE_COUNT${NC}"
fi

# ============================================================================
# 6. MERGE-READY GATE (HARD FAIL)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚦 MERGE-READY GATE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

GATE_PASS=true

if [ "$VITEST_SUCCESS" != "true" ] || [ "$FAILED_SUITES" != "0" ] || [ "$FAILED_TESTS" != "0" ]; then
  echo -e "${RED}❌ GATE FAILED: Vitest must have 0 failures${NC}"
  GATE_PASS=false
fi

if [ "$TYPECHECK_PASS" != true ]; then
  echo -e "${RED}❌ GATE FAILED: TypeCheck must pass${NC}"
  GATE_PASS=false
fi

if [ "$LINT_PASS" != true ]; then
  echo -e "${RED}❌ GATE FAILED: ESLint must pass${NC}"
  GATE_PASS=false
fi

if [ "$PENDING_TESTS" != "0" ]; then
  echo -e "${YELLOW}⚠️  WARNING: $PENDING_TESTS pending tests found${NC}"
fi

echo ""
if [ "$GATE_PASS" = true ]; then
  echo -e "${GREEN}✅✅✅ MERGE-READY: ALL GATES PASSED ✅✅✅${NC}"
  echo ""
  echo "📁 Artifacts saved to: $OUT"
  echo "📁 Scans saved to: $SCAN_DIR"
  exit 0
else
  echo -e "${RED}❌❌❌ NOT MERGE-READY: FIX FAILURES ABOVE ❌❌❌${NC}"
  echo ""
  echo "📁 Artifacts saved to: $OUT"
  echo "📁 Scans saved to: $SCAN_DIR"
  exit 1
fi
