#!/bin/bash
#
# CORS Security Test Script
# Tests CORS headers and origin validation
#
# Usage: ./scripts/security/test-cors.sh [base-url]
# Example: ./scripts/security/test-cors.sh http://localhost:3000
#

set -e

BASE_URL="${1:-http://localhost:3000}"
RESULTS_FILE="./qa/security/cors-test-results.log"
mkdir -p ./qa/security

echo "🔒 CORS Security Test"
echo "==============================="
echo "Testing: $BASE_URL"
echo "Results: $RESULTS_FILE"
echo ""

# Initialize results
cat > "$RESULTS_FILE" <<EOF
CORS Test Results
Generated: $(date)
Base URL: $BASE_URL
========================================

EOF

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function to test CORS
test_cors() {
  local origin="$1"
  local should_allow="$2"
  local description="$3"
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  echo "Test $TOTAL_TESTS: $description"
  echo "  Origin: $origin"
  echo "Test $TOTAL_TESTS: $description (Origin: $origin)" >> "$RESULTS_FILE"
  
  # Test OPTIONS preflight
  response=$(curl -s -w "\n%{http_code}\n" -X OPTIONS \
    -H "Origin: $origin" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    "$BASE_URL/api/souq/claims" 2>/dev/null)
  
  headers=$(echo "$response" | head -n -1)
  status_code=$(echo "$response" | tail -n1)
  
  # Extract CORS headers
  allow_origin=$(echo "$headers" | grep -i "access-control-allow-origin:" | cut -d: -f2 | tr -d ' \r')
  allow_methods=$(echo "$headers" | grep -i "access-control-allow-methods:" | cut -d: -f2 | tr -d ' \r')
  allow_headers=$(echo "$headers" | grep -i "access-control-allow-headers:" | cut -d: -f2 | tr -d ' \r')
  
  # Evaluate result
  if [ "$should_allow" = "true" ]; then
    # Should allow this origin
    if [ -n "$allow_origin" ] && ([ "$allow_origin" = "$origin" ] || [ "$allow_origin" = "*" ]); then
      echo -e "  ${GREEN}✓ PASS${NC} - Origin allowed (Status: $status_code)"
      echo "  ✓ PASS - Origin allowed" >> "$RESULTS_FILE"
      echo "    Access-Control-Allow-Origin: $allow_origin" >> "$RESULTS_FILE"
      echo "    Access-Control-Allow-Methods: $allow_methods" >> "$RESULTS_FILE"
      echo "    Access-Control-Allow-Headers: $allow_headers" >> "$RESULTS_FILE"
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      echo -e "  ${RED}✗ FAIL${NC} - Origin should be allowed but was blocked"
      echo "  ✗ FAIL - Origin should be allowed but was blocked" >> "$RESULTS_FILE"
      echo "    Status Code: $status_code" >> "$RESULTS_FILE"
      echo "    Access-Control-Allow-Origin: ${allow_origin:-<not set>}" >> "$RESULTS_FILE"
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
  else
    # Should block this origin
    if [ "$status_code" = "403" ] || [ -z "$allow_origin" ] || [ "$allow_origin" != "$origin" ]; then
      echo -e "  ${GREEN}✓ PASS${NC} - Origin blocked (Status: $status_code)"
      echo "  ✓ PASS - Origin blocked" >> "$RESULTS_FILE"
      echo "    Status Code: $status_code" >> "$RESULTS_FILE"
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      echo -e "  ${RED}✗ FAIL${NC} - Origin should be blocked but was allowed"
      echo "  ✗ FAIL - Origin should be blocked but was allowed" >> "$RESULTS_FILE"
      echo "    Access-Control-Allow-Origin: $allow_origin" >> "$RESULTS_FILE"
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
  fi
  
  echo "" >> "$RESULTS_FILE"
  echo ""
}

# Detect if running in production mode
if [[ "$BASE_URL" == "http://localhost"* ]]; then
  IS_DEV=true
  echo "🔧 Development mode detected (localhost)"
else
  IS_DEV=false
  echo "🚀 Production mode detected"
fi
echo ""

# Test allowed origins
echo "Testing Allowed Origins:"
test_cors "https://fixzit.sa" "true" "Main domain (fixzit.sa)"
test_cors "https://www.fixzit.sa" "true" "WWW subdomain"
test_cors "https://app.fixzit.sa" "true" "App subdomain"
test_cors "https://dashboard.fixzit.sa" "true" "Dashboard subdomain"
test_cors "https://staging.fixzit.sa" "true" "Staging environment"

# Test localhost (should work in dev, blocked in production)
if [ "$IS_DEV" = true ]; then
  test_cors "http://localhost:3000" "true" "Localhost (dev mode)"
  test_cors "http://localhost:3001" "true" "Localhost alt port (dev mode)"
else
  test_cors "http://localhost:3000" "false" "Localhost (production mode)"
fi

# Test blocked origins
echo "Testing Blocked Origins:"
test_cors "https://evil.com" "false" "Unknown domain"
test_cors "https://fixzit.co" "false" "Wrong TLD (.co instead of .sa)"
test_cors "https://phishing-fixzit.sa" "false" "Phishing attempt"
test_cors "https://fixzit.sa.evil.com" "false" "Subdomain of evil domain"
test_cors "http://fixzit.sa" "false" "HTTP instead of HTTPS"

# Test no origin header (should be allowed for same-origin requests)
echo "Test $(( TOTAL_TESTS + 1 )): No Origin Header"
echo "Test $(( TOTAL_TESTS + 1 )): No Origin Header" >> "$RESULTS_FILE"
response=$(curl -s -w "\n%{http_code}" -X OPTIONS \
  -H "Access-Control-Request-Method: POST" \
  "$BASE_URL/api/souq/claims" 2>/dev/null)
status_code=$(echo "$response" | tail -n1)

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
  echo -e "  ${GREEN}✓ PASS${NC} - Same-origin request allowed"
  echo "  ✓ PASS - Same-origin request allowed" >> "$RESULTS_FILE"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "  ${YELLOW}⚠ WARNING${NC} - Same-origin request blocked (Status: $status_code)"
  echo "  ⚠ WARNING - Same-origin request blocked" >> "$RESULTS_FILE"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo "" >> "$RESULTS_FILE"

# Summary
echo "==============================="
echo "Summary"
echo "==============================="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo ""

cat >> "$RESULTS_FILE" <<EOF
========================================
Summary
========================================
Total Tests: $TOTAL_TESTS
Passed: $PASSED_TESTS
Failed: $FAILED_TESTS
Pass Rate: $(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")%

Environment: $(if [ "$IS_DEV" = true ]; then echo "Development"; else echo "Production"; fi)
Status: $(if [ $FAILED_TESTS -eq 0 ]; then echo "✓ ALL TESTS PASSED"; else echo "✗ SOME TESTS FAILED"; fi)
EOF

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✓ All CORS tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. Check $RESULTS_FILE for details.${NC}"
  exit 1
fi
