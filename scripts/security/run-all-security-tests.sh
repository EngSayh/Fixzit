#!/bin/bash
#
# Master Security Test Runner
# Executes all security validation tests and generates comprehensive report
#
# Usage: ./scripts/security/run-all-security-tests.sh [base-url]
# Example: ./scripts/security/run-all-security-tests.sh http://localhost:3000
#

set -e

BASE_URL="${1:-http://localhost:3000}"
REPORT_FILE="./qa/security/COMPREHENSIVE_SECURITY_REPORT.md"
mkdir -p ./qa/security

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Fixzit Security Test Suite         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""
echo "Testing: $BASE_URL"
echo "Report: $REPORT_FILE"
echo ""

# Initialize comprehensive report
cat > "$REPORT_FILE" <<EOF
# Comprehensive Security Test Report
**Generated:** $(date)  
**Base URL:** $BASE_URL  
**Test Suite Version:** 1.0.0

---

## Executive Summary

This report contains the results of all automated security tests for the Fixzit application.

EOF

# Track overall results
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

# Function to run test suite
run_suite() {
  local suite_name="$1"
  local script_path="$2"
  local args="$3"
  
  TOTAL_SUITES=$((TOTAL_SUITES + 1))
  
  echo -e "${BLUE}┌─────────────────────────────────────┐${NC}"
  echo -e "${BLUE}│ Running: $suite_name${NC}"
  echo -e "${BLUE}└─────────────────────────────────────┘${NC}"
  echo ""
  
  cat >> "$REPORT_FILE" <<EOF
### Test Suite $TOTAL_SUITES: $suite_name

EOF
  
  if bash "$script_path" $args; then
    echo -e "${GREEN}✓ $suite_name: PASSED${NC}"
    echo ""
    PASSED_SUITES=$((PASSED_SUITES + 1))
    echo "**Status:** ✅ PASSED" >> "$REPORT_FILE"
  else
    echo -e "${RED}✗ $suite_name: FAILED${NC}"
    echo ""
    FAILED_SUITES=$((FAILED_SUITES + 1))
    echo "**Status:** ❌ FAILED" >> "$REPORT_FILE"
  fi
  
  echo "" >> "$REPORT_FILE"
  echo "---" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
}

# Run all security test suites
echo -e "${YELLOW}Starting security test suites...${NC}"
echo ""

# Suite 1: Rate Limiting
run_suite "Rate Limiting Tests" "./scripts/security/test-rate-limiting.sh" "$BASE_URL"

# Suite 2: CORS Policy
run_suite "CORS Policy Tests" "./scripts/security/test-cors.sh" "$BASE_URL"

# Suite 3: MongoDB Security
run_suite "MongoDB Security Tests" "./scripts/security/test-mongodb-security.sh" ""

# Suite 4: NPM Audit
echo -e "${BLUE}┌─────────────────────────────────────┐${NC}"
echo -e "${BLUE}│ Running: NPM Security Audit${NC}"
echo -e "${BLUE}└─────────────────────────────────────┘${NC}"
echo ""

TOTAL_SUITES=$((TOTAL_SUITES + 1))
cat >> "$REPORT_FILE" <<EOF
### Test Suite $TOTAL_SUITES: NPM Security Audit

EOF

audit_output=$(pnpm audit --json 2>&1 || true)
audit_summary=$(echo "$audit_output" | jq -r '.metadata | "Critical: \(.vulnerabilities.critical // 0), High: \(.vulnerabilities.high // 0), Moderate: \(.vulnerabilities.moderate // 0), Low: \(.vulnerabilities.low // 0)"' 2>/dev/null || echo "Could not parse audit results")

critical_count=$(echo "$audit_output" | jq -r '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo "0")

echo "NPM Audit Results: $audit_summary"
echo ""

cat >> "$REPORT_FILE" <<EOF
**Vulnerabilities:** $audit_summary

EOF

if [ "$critical_count" -eq 0 ]; then
  echo -e "${GREEN}✓ NPM Audit: PASSED (No critical vulnerabilities)${NC}"
  PASSED_SUITES=$((PASSED_SUITES + 1))
  echo "**Status:** ✅ PASSED (No critical vulnerabilities)" >> "$REPORT_FILE"
else
  echo -e "${RED}✗ NPM Audit: FAILED ($critical_count critical vulnerabilities)${NC}"
  FAILED_SUITES=$((FAILED_SUITES + 1))
  echo "**Status:** ❌ FAILED ($critical_count critical vulnerabilities)" >> "$REPORT_FILE"
fi

echo ""
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Generate final summary
PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED_SUITES/$TOTAL_SUITES)*100}")

cat >> "$REPORT_FILE" <<EOF
## Final Summary

| Metric | Value |
|--------|-------|
| Total Test Suites | $TOTAL_SUITES |
| Passed | $PASSED_SUITES |
| Failed | $FAILED_SUITES |
| Pass Rate | $PASS_RATE% |

### Test Suite Breakdown

1. **Rate Limiting Tests:** $(if grep -q "Rate Limiting.*PASSED" "$REPORT_FILE"; then echo "✅ PASSED"; else echo "❌ FAILED"; fi)
2. **CORS Policy Tests:** $(if grep -q "CORS Policy.*PASSED" "$REPORT_FILE"; then echo "✅ PASSED"; else echo "❌ FAILED"; fi)
3. **MongoDB Security Tests:** $(if grep -q "MongoDB Security.*PASSED" "$REPORT_FILE"; then echo "✅ PASSED"; else echo "❌ FAILED"; fi)
4. **NPM Security Audit:** $(if [ "$critical_count" -eq 0 ]; then echo "✅ PASSED"; else echo "❌ FAILED"; fi)

### Security Score

Based on the automated tests, the security posture is:

EOF

if [ $FAILED_SUITES -eq 0 ]; then
  SECURITY_SCORE="95/100"
  SECURITY_STATUS="🟢 EXCELLENT"
  RECOMMENDATION="All automated security tests passed. Ready for production deployment."
elif [ $PASSED_SUITES -ge 3 ]; then
  SECURITY_SCORE="75/100"
  SECURITY_STATUS="🟡 GOOD"
  RECOMMENDATION="Most security tests passed. Review failed tests before production deployment."
else
  SECURITY_SCORE="50/100"
  SECURITY_STATUS="🔴 NEEDS WORK"
  RECOMMENDATION="Multiple security tests failed. Address all issues before production deployment."
fi

cat >> "$REPORT_FILE" <<EOF
**Score:** $SECURITY_SCORE  
**Status:** $SECURITY_STATUS  
**Recommendation:** $RECOMMENDATION

### Detailed Results

For detailed test results, see:
- \`./qa/security/rate-limit-test-results.log\`
- \`./qa/security/cors-test-results.log\`
- \`./qa/security/mongodb-test-results.log\`

### Next Steps

EOF

if [ $FAILED_SUITES -gt 0 ]; then
  cat >> "$REPORT_FILE" <<EOF
1. ❌ **Fix failed tests** - Review individual test logs for details
2. 🔄 **Re-run tests** - Verify fixes with \`./scripts/security/run-all-security-tests.sh\`
3. 📋 **Update documentation** - Document any security exceptions or mitigations
4. ✅ **Get approval** - Obtain security team sign-off before deployment

EOF
else
  cat >> "$REPORT_FILE" <<EOF
1. ✅ **All tests passed** - Security posture is strong
2. 📋 **Update docs** - Add this report to deployment documentation
3. 🚀 **Deploy to staging** - Test in staging environment
4. 🎯 **Monitor production** - Set up security event monitoring

EOF
fi

cat >> "$REPORT_FILE" <<EOF
---

**Report generated by:** Fixzit Security Test Suite  
**Contact:** engineering@fixzit.sa  
**Last Updated:** $(date)
EOF

# Display final summary
echo ""
echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Security Test Suite Complete        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""
echo "Total Suites: $TOTAL_SUITES"
echo "Passed: $PASSED_SUITES"
echo "Failed: $FAILED_SUITES"
echo "Pass Rate: $PASS_RATE%"
echo ""
echo "Security Score: $SECURITY_SCORE"
echo "Status: $SECURITY_STATUS"
echo ""
echo "Comprehensive report: $REPORT_FILE"
echo ""

if [ $FAILED_SUITES -eq 0 ]; then
  echo -e "${GREEN}✓ All security tests passed!${NC}"
  echo -e "${GREEN}✓ System is ready for production deployment.${NC}"
  exit 0
else
  echo -e "${RED}✗ Some security tests failed.${NC}"
  echo -e "${YELLOW}⚠ Review detailed logs and fix issues before deployment.${NC}"
  exit 1
fi
