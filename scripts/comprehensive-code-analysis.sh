#!/bin/bash

# Comprehensive Codebase Analysis Script
# Identifies all issues: TypeScript errors, ESLint warnings, test failures, etc.

set -e

REPORT_DIR="qa/analysis"
mkdir -p "$REPORT_DIR"

echo "═══════════════════════════════════════════════════════════════"
echo "  COMPREHENSIVE CODEBASE ANALYSIS"
echo "  $(date)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# 1. TypeScript Compilation Check
echo "📝 1. Running TypeScript compilation check..."
if pnpm exec tsc --noEmit > "$REPORT_DIR/typescript-errors.txt" 2>&1; then
  echo "   ✅ No TypeScript errors found"
  echo "✅ PASS" > "$REPORT_DIR/typescript-status.txt"
else
  ERROR_COUNT=$(grep -c "error TS" "$REPORT_DIR/typescript-errors.txt" || echo "0")
  echo "   ❌ Found $ERROR_COUNT TypeScript errors"
  echo "❌ FAIL: $ERROR_COUNT errors" > "$REPORT_DIR/typescript-status.txt"
fi
echo ""

# 2. ESLint Check
echo "📝 2. Running ESLint check..."
if pnpm lint > "$REPORT_DIR/eslint-output.txt" 2>&1; then
  echo "   ✅ No ESLint errors found"
  echo "✅ PASS" > "$REPORT_DIR/eslint-status.txt"
else
  ERROR_COUNT=$(grep -c "error" "$REPORT_DIR/eslint-output.txt" || echo "0")
  WARNING_COUNT=$(grep -c "warning" "$REPORT_DIR/eslint-output.txt" || echo "0")
  echo "   ❌ Found $ERROR_COUNT errors, $WARNING_COUNT warnings"
  echo "❌ FAIL: $ERROR_COUNT errors, $WARNING_COUNT warnings" > "$REPORT_DIR/eslint-status.txt"
fi
echo ""

# 3. Dead Code Detection
echo "📝 3. Detecting unused exports..."
if command -v ts-prune &> /dev/null; then
  pnpm exec ts-prune > "$REPORT_DIR/unused-exports.txt" 2>&1 || true
  UNUSED_COUNT=$(grep -c "used in module" "$REPORT_DIR/unused-exports.txt" || echo "0")
  echo "   ℹ️  Found $UNUSED_COUNT potentially unused exports"
else
  echo "   ⚠️  ts-prune not installed, skipping"
  echo "N/A" > "$REPORT_DIR/unused-exports.txt"
fi
echo ""

# 4. Dependency Analysis
echo "📝 4. Checking for unused dependencies..."
if command -v depcheck &> /dev/null; then
  pnpm exec depcheck --json > "$REPORT_DIR/unused-deps.json" 2>&1 || true
  echo "   ✅ Dependency check complete"
else
  echo "   ⚠️  depcheck not installed, skipping"
  echo "{}" > "$REPORT_DIR/unused-deps.json"
fi
echo ""

# 5. Security Audit
echo "📝 5. Running npm security audit..."
pnpm audit --json > "$REPORT_DIR/npm-audit.json" 2>&1 || true
pnpm audit > "$REPORT_DIR/npm-audit.txt" 2>&1 || true
VULN_COUNT=$(pnpm audit 2>&1 | grep "vulnerabilities found" | awk '{print $1}' || echo "0")
echo "   ℹ️  Found $VULN_COUNT total vulnerabilities"
echo ""

# 6. Build Test
echo "📝 6. Testing build..."
export DISABLE_MONGODB_FOR_BUILD=true
export ALLOW_LOCAL_MONGODB=true
if pnpm run build --no-lint > "$REPORT_DIR/build-output.txt" 2>&1; then
  echo "   ✅ Build succeeded"
  echo "✅ PASS" > "$REPORT_DIR/build-status.txt"
else
  echo "   ❌ Build failed"
  echo "❌ FAIL" > "$REPORT_DIR/build-status.txt"
fi
echo ""

# 7. Generate Summary Report
echo "═══════════════════════════════════════════════════════════════"
echo "  SUMMARY REPORT"
echo "═══════════════════════════════════════════════════════════════"

cat > "$REPORT_DIR/ANALYSIS_SUMMARY.md" <<EOF
# Comprehensive Codebase Analysis Report
**Date:** $(date)
**Status:** Analysis Complete

## Results Summary

### 1. TypeScript Compilation
$(cat "$REPORT_DIR/typescript-status.txt")

### 2. ESLint
$(cat "$REPORT_DIR/eslint-status.txt")

### 3. Build Test
$(cat "$REPORT_DIR/build-status.txt")

### 4. Security Audit
- Total vulnerabilities: $VULN_COUNT
- See: qa/analysis/npm-audit.txt for details

### 5. Code Quality
- Unused exports: $UNUSED_COUNT (see unused-exports.txt)
- Dependency check: See unused-deps.json

## Detailed Reports

All detailed reports are available in \`qa/analysis/\`:
- \`typescript-errors.txt\` - TypeScript compilation errors
- \`eslint-output.txt\` - ESLint errors and warnings
- \`npm-audit.txt\` - Security vulnerabilities
- \`build-output.txt\` - Build process output
- \`unused-exports.txt\` - Potentially unused code
- \`unused-deps.json\` - Unused dependencies

## Next Steps

Review each report and prioritize fixes based on:
1. **Critical:** Build failures, TypeScript errors blocking compilation
2. **High:** ESLint errors, security vulnerabilities (prod dependencies)
3. **Medium:** ESLint warnings, unused exports
4. **Low:** Dev dependencies vulnerabilities, minor optimizations
EOF

echo ""
cat "$REPORT_DIR/ANALYSIS_SUMMARY.md"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Full report saved to: $REPORT_DIR/ANALYSIS_SUMMARY.md"
echo "═══════════════════════════════════════════════════════════════"
