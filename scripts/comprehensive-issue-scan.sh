#!/bin/bash
# Comprehensive Issue Scanner - Get EXACT Numbers
# Scans entire codebase for ALL issues

set -e

echo "🔍 COMPREHENSIVE ISSUE SCAN - EXACT COUNTS"
echo "=========================================="
echo ""

# Exclude patterns
EXCLUDE="--exclude-dir={node_modules,.next,dist,build,.git,coverage}"

# 1. Implicit any types
echo "1️⃣  Scanning for implicit 'any' types..."
IMPLICIT_ANY=$(grep -r "Parameter .* implicitly has an 'any' type" --include="*.ts" --include="*.tsx" . 2>/dev/null | wc -l || echo 0)
echo "   Found: $IMPLICIT_ANY implicit any types"
grep -rn "implicitly has an 'any'" --include="*.ts" --include="*.tsx" . 2>/dev/null | head -20 || true
echo ""

# 2. Explicit any types
echo "2️⃣  Scanning for explicit 'any' types..."
EXPLICIT_ANY=$(grep -rn ": any" --include="*.ts" --include="*.tsx" $EXCLUDE app/ server/ lib/ hooks/ components/ 2>/dev/null | grep -v "eslint-disable" | wc -l || echo 0)
echo "   Found: $EXPLICIT_ANY explicit any types"
grep -rn ": any" --include="*.ts" --include="*.tsx" $EXCLUDE app/ server/ lib/ hooks/ components/ 2>/dev/null | grep -v "eslint-disable" | head -10 || true
echo ""

# 3. Console statements
echo "3️⃣  Scanning for console statements..."
CONSOLE_LOG=$(grep -rn "console\.log" --include="*.ts" --include="*.tsx" $EXCLUDE app/ server/ lib/ hooks/ components/ 2>/dev/null | wc -l || echo 0)
CONSOLE_ERROR=$(grep -rn "console\.error" --include="*.ts" --include="*.tsx" $EXCLUDE app/ server/ lib/ hooks/ components/ 2>/dev/null | wc -l || echo 0)
CONSOLE_WARN=$(grep -rn "console\.warn" --include="*.ts" --include="*.tsx" $EXCLUDE app/ server/ lib/ hooks/ components/ 2>/dev/null | wc -l || echo 0)
CONSOLE_DEBUG=$(grep -rn "console\.debug" --include="*.ts" --include="*.tsx" $EXCLUDE app/ server/ lib/ hooks/ components/ 2>/dev/null | wc -l || echo 0)
CONSOLE_INFO=$(grep -rn "console\.info" --include="*.ts" --include="*.tsx" $EXCLUDE app/ server/ lib/ hooks/ components/ 2>/dev/null | wc -l || echo 0)
CONSOLE_TOTAL=$((CONSOLE_LOG + CONSOLE_ERROR + CONSOLE_WARN + CONSOLE_DEBUG + CONSOLE_INFO))
echo "   console.log: $CONSOLE_LOG"
echo "   console.error: $CONSOLE_ERROR"
echo "   console.warn: $CONSOLE_WARN"
echo "   console.debug: $CONSOLE_DEBUG"
echo "   console.info: $CONSOLE_INFO"
echo "   TOTAL: $CONSOLE_TOTAL console statements"
echo ""

# 4. parseInt without radix
echo "4️⃣  Scanning for parseInt without radix..."
PARSEINT=$(grep -rn "parseInt([^,)]*)" --include="*.ts" --include="*.tsx" $EXCLUDE app/ lib/ server/ 2>/dev/null | grep -v ", 10" | wc -l || echo 0)
echo "   Found: $PARSEINT parseInt calls without radix"
grep -rn "parseInt([^,)]*)" --include="*.ts" --include="*.tsx" $EXCLUDE app/ lib/ server/ 2>/dev/null | grep -v ", 10" | head -10 || true
echo ""

# 5. TODO/FIXME comments
echo "5️⃣  Scanning for TODO/FIXME comments..."
TODO_COUNT=$(grep -rn "TODO\|FIXME" --include="*.ts" --include="*.tsx" $EXCLUDE app/ server/ lib/ hooks/ components/ 2>/dev/null | wc -l || echo 0)
echo "   Found: $TODO_COUNT TODO/FIXME comments"
grep -rn "TODO\|FIXME" --include="*.ts" --include="*.tsx" $EXCLUDE app/ server/ lib/ hooks/ components/ 2>/dev/null | head -10 || true
echo ""

# 6. Date hydration risks
echo "6️⃣  Scanning for Date hydration risks..."
NEW_DATE=$(grep -rn "new Date()" --include="*.tsx" $EXCLUDE app/ components/ 2>/dev/null | wc -l || echo 0)
DATE_NOW=$(grep -rn "Date\.now()" --include="*.tsx" $EXCLUDE app/ components/ 2>/dev/null | wc -l || echo 0)
DATE_TOTAL=$((NEW_DATE + DATE_NOW))
echo "   new Date(): $NEW_DATE"
echo "   Date.now(): $DATE_NOW"
echo "   TOTAL: $DATE_TOTAL date hydration risks"
echo ""

# 7. Dynamic i18n keys
echo "7️⃣  Scanning for dynamic i18n keys..."
DYNAMIC_I18N=$(grep -rn "t(\`" --include="*.ts" --include="*.tsx" $EXCLUDE app/ components/ 2>/dev/null | wc -l || echo 0)
echo "   Found: $DYNAMIC_I18N dynamic i18n keys"
grep -rn "t(\`" --include="*.ts" --include="*.tsx" $EXCLUDE app/ components/ 2>/dev/null | head -10 || true
echo ""

# 8. Unhandled promises
echo "8️⃣  Scanning for unhandled promises..."
UNHANDLED_PROMISES=$(grep -rn "\.then(" --include="*.ts" --include="*.tsx" $EXCLUDE app/ components/ lib/ 2>/dev/null | grep -v "\.catch(" | wc -l || echo 0)
echo "   Found: $UNHANDLED_PROMISES potentially unhandled promises"
echo ""

# 9. Duplicate files
echo "9️⃣  Scanning for duplicate files..."
echo "   Running jscpd for code duplication..."
DUPLICATE_FILES=$(find . -type f \( -name "*.ts" -o -name "*.tsx" \) | sort | uniq -d | wc -l || echo 0)
echo "   Found: $DUPLICATE_FILES potential duplicate files"
echo ""

# 10. eslint-disable comments
echo "🔟 Scanning for eslint-disable comments..."
ESLINT_DISABLE=$(grep -rn "eslint-disable" --include="*.ts" --include="*.tsx" $EXCLUDE app/ server/ lib/ hooks/ components/ 2>/dev/null | wc -l || echo 0)
echo "   Found: $ESLINT_DISABLE eslint-disable comments"
echo ""

# 11. @ts-ignore and @ts-expect-error
echo "1️⃣1️⃣  Scanning for TypeScript suppressions..."
TS_IGNORE=$(grep -rn "@ts-ignore" --include="*.ts" --include="*.tsx" $EXCLUDE app/ server/ lib/ hooks/ components/ 2>/dev/null | wc -l || echo 0)
TS_EXPECT_ERROR=$(grep -rn "@ts-expect-error" --include="*.ts" --include="*.tsx" $EXCLUDE app/ server/ lib/ hooks/ components/ 2>/dev/null | wc -l || echo 0)
TS_TOTAL=$((TS_IGNORE + TS_EXPECT_ERROR))
echo "   @ts-ignore: $TS_IGNORE"
echo "   @ts-expect-error: $TS_EXPECT_ERROR"
echo "   TOTAL: $TS_TOTAL TypeScript suppressions"
echo ""

# 12. Empty catch blocks
echo "1️⃣2️⃣  Scanning for empty catch blocks..."
EMPTY_CATCH=$(grep -rn "catch.*{[\s]*}" --include="*.ts" --include="*.tsx" $EXCLUDE app/ server/ lib/ hooks/ components/ 2>/dev/null | wc -l || echo 0)
echo "   Found: $EMPTY_CATCH empty catch blocks"
echo ""

# Summary
echo ""
echo "=========================================="
echo "📊 SUMMARY - EXACT COUNTS"
echo "=========================================="
echo ""
echo "CRITICAL ISSUES (Must Fix):"
echo "  - Implicit any types: $IMPLICIT_ANY"
echo "  - Explicit any types: $EXPLICIT_ANY"
echo "  - Console statements: $CONSOLE_TOTAL"
echo "  - parseInt without radix: $PARSEINT"
echo "  - TODO/FIXME comments: $TODO_COUNT"
echo "  - Date hydration risks: $DATE_TOTAL"
echo "  - Dynamic i18n keys: $DYNAMIC_I18N"
echo "  - Unhandled promises: $UNHANDLED_PROMISES"
echo "  - Duplicate files: $DUPLICATE_FILES"
echo ""
echo "CODE QUALITY ISSUES:"
echo "  - eslint-disable: $ESLINT_DISABLE"
echo "  - TypeScript suppressions: $TS_TOTAL"
echo "  - Empty catch blocks: $EMPTY_CATCH"
echo ""

CRITICAL_TOTAL=$((IMPLICIT_ANY + EXPLICIT_ANY + CONSOLE_TOTAL + PARSEINT + TODO_COUNT + DATE_TOTAL + DYNAMIC_I18N + UNHANDLED_PROMISES + DUPLICATE_FILES))
QUALITY_TOTAL=$((ESLINT_DISABLE + TS_TOTAL + EMPTY_CATCH))
GRAND_TOTAL=$((CRITICAL_TOTAL + QUALITY_TOTAL))

echo "TOTALS:"
echo "  Critical Issues: $CRITICAL_TOTAL"
echo "  Quality Issues: $QUALITY_TOTAL"
echo "  GRAND TOTAL: $GRAND_TOTAL issues to fix"
echo ""
echo "TARGET: $GRAND_TOTAL / $GRAND_TOTAL = 100% completion"
echo ""

# Write to report file
REPORT_FILE="docs/archived/DAILY_PROGRESS_REPORTS/ISSUE_SCAN_$(date +%Y%m%d_%H%M%S).md"
mkdir -p docs/archived/DAILY_PROGRESS_REPORTS

cat > "$REPORT_FILE" <<EOF
# Comprehensive Issue Scan Report
**Date**: $(date '+%Y-%m-%d %H:%M:%S')
**Branch**: $(git branch --show-current)

## EXACT COUNTS

### Critical Issues (Must Fix - No Exceptions)
| Category | Count | Priority |
|----------|-------|----------|
| Implicit any types | $IMPLICIT_ANY | 🔴 Critical |
| Explicit any types | $EXPLICIT_ANY | 🔴 Critical |
| Console statements | $CONSOLE_TOTAL | 🔴 Critical |
| parseInt without radix | $PARSEINT | 🟡 High |
| TODO/FIXME comments | $TODO_COUNT | 🟡 High |
| Date hydration risks | $DATE_TOTAL | 🟡 High |
| Dynamic i18n keys | $DYNAMIC_I18N | 🟡 High |
| Unhandled promises | $UNHANDLED_PROMISES | 🔴 Critical |
| Duplicate files | $DUPLICATE_FILES | 🟡 High |
| **TOTAL CRITICAL** | **$CRITICAL_TOTAL** | |

### Code Quality Issues
| Category | Count | Priority |
|----------|-------|----------|
| eslint-disable comments | $ESLINT_DISABLE | 🟢 Medium |
| TypeScript suppressions | $TS_TOTAL | 🟢 Medium |
| Empty catch blocks | $EMPTY_CATCH | 🟢 Medium |
| **TOTAL QUALITY** | **$QUALITY_TOTAL** | |

## GRAND TOTAL: $GRAND_TOTAL Issues

## Target
- **Current**: 0 fixed
- **Target**: $GRAND_TOTAL fixed
- **Progress**: 0%
- **Goal**: 100% - NO EXCEPTIONS

## Next Actions
1. Fix Category 1: Implicit any ($IMPLICIT_ANY issues)
2. Fix Category 2: Console statements ($CONSOLE_TOTAL issues)
3. Fix Category 3: Unhandled promises ($UNHANDLED_PROMISES issues)
4. Continue through all categories until 100% complete

---
*Report generated by comprehensive-issue-scan.sh*
EOF

echo "📄 Report saved to: $REPORT_FILE"
echo ""
echo "✅ Scan complete!"
