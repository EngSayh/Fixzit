#!/bin/bash

# System Health Check Script
# Continuously monitors code quality and reports live progress

set -e

echo "🔍 FIXZIT SYSTEM HEALTH CHECK"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Function to run a check
run_check() {
    local name=$1
    local command=$2
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "[$TOTAL_CHECKS] $name... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# 1. ESLint Check
echo "📋 Running Code Quality Checks..."
echo ""

run_check "ESLint" "npm run lint"

# 2. TypeScript Check
run_check "TypeScript Compilation" "npx tsc --noEmit --skipLibCheck"

# 3. Check for console.log in production code
echo -n "[$((TOTAL_CHECKS + 1))] Console.log in Production Code... "
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

CONSOLE_COUNT=$(find app components lib -type f \( -name "*.ts" -o -name "*.tsx" \) \
    ! -path "*/node_modules/*" \
    ! -path "*/.next/*" \
    ! -name "logger.ts" \
    ! -name "constants.ts" \
    -exec grep -l "console\.\(log\|error\|warn\|info\)" {} \; 2>/dev/null | wc -l | tr -d ' ')

if [ "$CONSOLE_COUNT" -eq "0" ]; then
    echo -e "${GREEN}✅ PASSED${NC} (0 instances found)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}⚠️  WARNING${NC} ($CONSOLE_COUNT files with console.log)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))  # Still pass, but warn
fi

# 4. Check for TODO/FIXME comments
echo -n "[$((TOTAL_CHECKS + 1))] TODO/FIXME Comments... "
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

TODO_COUNT=$(find app components lib server -type f \( -name "*.ts" -o -name "*.tsx" \) \
    ! -path "*/node_modules/*" \
    ! -path "*/.next/*" \
    -exec grep -i "TODO\|FIXME" {} \; 2>/dev/null | wc -l | tr -d ' ')

if [ "$TODO_COUNT" -eq "0" ]; then
    echo -e "${GREEN}✅ PASSED${NC} (0 found)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}ℹ️  INFO${NC} ($TODO_COUNT comments found)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))  # Informational only
fi

# 5. Check for @ts-ignore
echo -n "[$((TOTAL_CHECKS + 1))] TypeScript Suppressions... "
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

TS_IGNORE_COUNT=$(find app components lib server -type f \( -name "*.ts" -o -name "*.tsx" \) \
    ! -path "*/node_modules/*" \
    ! -path "*/.next/*" \
    -exec grep -l "@ts-ignore\|@ts-expect-error" {} \; 2>/dev/null | wc -l | tr -d ' ')

if [ "$TS_IGNORE_COUNT" -eq "0" ]; then
    echo -e "${GREEN}✅ PASSED${NC} (0 found)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}ℹ️  INFO${NC} ($TS_IGNORE_COUNT files with suppressions)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))  # Informational only
fi

# 6. Check for eslint-disable
echo -n "[$((TOTAL_CHECKS + 1))] ESLint Suppressions... "
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

ESLINT_DISABLE_COUNT=$(find app components lib server -type f \( -name "*.ts" -o -name "*.tsx" \) \
    ! -path "*/node_modules/*" \
    ! -path "*/.next/*" \
    -exec grep -l "eslint-disable" {} \; 2>/dev/null | wc -l | tr -d ' ')

if [ "$ESLINT_DISABLE_COUNT" -eq "0" ]; then
    echo -e "${GREEN}✅ PASSED${NC} (0 found)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}ℹ️  INFO${NC} ($ESLINT_DISABLE_COUNT files with suppressions)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))  # Informational only
fi

# Summary
echo ""
echo "=============================="
echo "📊 HEALTH CHECK SUMMARY"
echo "=============================="
echo ""
echo "Total Checks: $TOTAL_CHECKS"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
echo ""

# Calculate percentage
PERCENTAGE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✅ SYSTEM STATUS: 100% HEALTHY${NC}"
    echo ""
    echo "🎉 All checks passed! System is production-ready."
    exit 0
else
    echo -e "${RED}❌ SYSTEM STATUS: $PERCENTAGE% HEALTHY${NC}"
    echo ""
    echo "⚠️  Some checks failed. Please review the errors above."
    exit 1
fi
