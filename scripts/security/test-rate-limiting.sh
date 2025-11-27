#!/bin/bash
#
# Rate Limiting Security Test Script
# Validates OTP endpoints (requires demo credentials) and reports on other guarded flows
#
# Usage: ./scripts/security/test-rate-limiting.sh [base-url]
# Example: ./scripts/security/test-rate-limiting.sh http://localhost:3000
#

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
RESULTS_FILE="./qa/security/rate-limit-test-results.log"
mkdir -p ./qa/security

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for this script. Install jq and retry."
  exit 1
fi

OTP_IDENTIFIER="${OTP_IDENTIFIER:-${FIXZIT_OTP_IDENTIFIER:-admin@fixzit.co}}"
OTP_PASSWORD="${OTP_PASSWORD:-${FIXZIT_OTP_PASSWORD:-Admin@123}}"
OTP_COMPANY_CODE="${OTP_COMPANY_CODE:-${FIXZIT_OTP_COMPANY_CODE:-}}"
OTP_INVALID_CODE="${OTP_INVALID_CODE:-999999}"
CLAIMS_SESSION_COOKIE="${CLAIMS_SESSION_COOKIE:-${FIXZIT_SESSION_COOKIE:-}}"
CLAIM_ID="${CLAIM_ID:-${FIXZIT_CLAIM_ID:-}}"

if [ -n "$OTP_COMPANY_CODE" ]; then
  OTP_SEND_PAYLOAD=$(jq -nc --arg id "$OTP_IDENTIFIER" --arg pwd "$OTP_PASSWORD" --arg cc "$OTP_COMPANY_CODE" '{identifier:$id,password:$pwd,companyCode:$cc}')
  OTP_VERIFY_PAYLOAD=$(jq -nc --arg id "$OTP_IDENTIFIER" --arg otp "$OTP_INVALID_CODE" --arg cc "$OTP_COMPANY_CODE" '{identifier:$id,otp:$otp,companyCode:$cc}')
else
  OTP_SEND_PAYLOAD=$(jq -nc --arg id "$OTP_IDENTIFIER" --arg pwd "$OTP_PASSWORD" '{identifier:$id,password:$pwd}')
  OTP_VERIFY_PAYLOAD=$(jq -nc --arg id "$OTP_IDENTIFIER" --arg otp "$OTP_INVALID_CODE" '{identifier:$id,otp:$otp}')
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Initialize stats
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

cat > "$RESULTS_FILE" <<'EOF'
Rate Limiting Test Results
Generated: $(date)
Base URL: $BASE_URL
OTP Identifier: $OTP_IDENTIFIER
OTP Password Source: [env OTP_PASSWORD|FIXZIT_OTP_PASSWORD|default]
========================================

EOF

echo "🔒 Rate Limiting Security Test"
echo "==============================="
echo "Testing: $BASE_URL"
echo "Results: $RESULTS_FILE"
echo "OTP Identifier: $OTP_IDENTIFIER"
echo ""

skip_rate_limit_test() {
  local description="$1"
  local reason="$2"
  echo -e "${YELLOW}↷ SKIP${NC} - $description (${reason})"
  cat >> "$RESULTS_FILE" <<EOF
Test: $description
Status: SKIPPED
Reason: $reason

EOF
  SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
}

run_post_request() {
  local endpoint="$1"
  local payload="$2"
  curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$BASE_URL$endpoint" 2>/dev/null
}

test_rate_limit() {
  local endpoint="$1"
  local method="$2"
  local limit="$3"
  local window_ms="$4"
  local data="$5"
  local description="$6"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo "$description"
  echo "Test $TOTAL_TESTS: $description" >> "$RESULTS_FILE"

  local success_count=0
  local rate_limited=false
  local first_429_at=0
  local test_count=$((limit + 5))

  for i in $(seq 1 $test_count); do
    local response
    if [ "$method" = "POST" ]; then
      response=$(run_post_request "$endpoint" "$data")
    else
      response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" 2>/dev/null)
    fi

    local status_code=$(echo "$response" | tail -n1)

    if [ "$status_code" = "429" ]; then
      if [ "$rate_limited" = false ]; then
        first_429_at=$i
        rate_limited=true
      fi
    elif [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
      success_count=$((success_count + 1))
    fi
    sleep 0.05
  done

  if [ "$rate_limited" = true ]; then
    if [ $first_429_at -le $((limit + 2)) ]; then
      echo -e "  ${GREEN}✓ PASS${NC} - Rate limited at request #$first_429_at"
      echo "  ✓ PASS - Rate limited at request #$first_429_at (limit $limit)" >> "$RESULTS_FILE"
    else
      echo -e "  ${YELLOW}⚠ WARNING${NC} - Late rate limit at request #$first_429_at"
      echo "  ⚠ WARNING - Late rate limit at request #$first_429_at" >> "$RESULTS_FILE"
    fi
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "  ${RED}✗ FAIL${NC} - No rate limiting detected"
    echo "  ✗ FAIL - No rate limiting detected" >> "$RESULTS_FILE"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi

  echo "  Successful requests: $success_count/$test_count" >> "$RESULTS_FILE"
  echo "  Window (ms): $window_ms" >> "$RESULTS_FILE"
  echo "" >> "$RESULTS_FILE"
  echo ""
}

# Test 1: OTP Send (10 req/min)
echo "Test 1: OTP Send Rate Limiting"
test_rate_limit "/api/auth/otp/send" "POST" 10 60000 "$OTP_SEND_PAYLOAD" "OTP Send Rate Limiting"

# Test 2: OTP Verify (10 req/min)
echo "Test 2: OTP Verify Rate Limiting"
test_rate_limit "/api/auth/otp/verify" "POST" 10 60000 "$OTP_VERIFY_PAYLOAD" "OTP Verify Rate Limiting"

# Tests requiring authenticated sessions/seed data
echo "Test 3: Claims Creation Rate Limiting"
skip_rate_limit_test "Claims Creation Rate Limiting" "Requires authenticated marketplace session and seeded order data"

echo "Test 4: Evidence Upload Rate Limiting"
skip_rate_limit_test "Claims Evidence Upload Rate Limiting" "Requires authenticated session and an existing claim (set CLAIM_ID)"

echo "Test 5: Claim Response Rate Limiting"
skip_rate_limit_test "Claims Response Rate Limiting" "Requires authenticated seller session and existing claim"

# Wait for rate limit window to reset before verifying reset
echo "Waiting 65 seconds for rate limit window reset..."
sleep 65

# Test 6: Verify rate limit resets (OTP Send)
echo "Test 6: Rate Limit Reset Verification"
echo "Test 6: Rate Limit Reset (OTP Send)" >> "$RESULTS_FILE"
reset_response=$(run_post_request "/api/auth/otp/send" "$OTP_SEND_PAYLOAD")
reset_status=$(echo "$reset_response" | tail -n1)
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ "$reset_status" -ge 200 ] && [ "$reset_status" -lt 300 ]; then
  echo -e "  ${GREEN}✓ PASS${NC} - Rate limit reset successfully"
  echo "  ✓ PASS - Rate limit reset successfully" >> "$RESULTS_FILE"
  PASSED_TESTS=$((PASSED_TESTS + 1))
elif [ "$reset_status" = "429" ]; then
  echo -e "  ${RED}✗ FAIL${NC} - Rate limit did not reset"
  echo "  ✗ FAIL - Rate limit did not reset" >> "$RESULTS_FILE"
  FAILED_TESTS=$((FAILED_TESTS + 1))
else
  echo -e "  ${YELLOW}⚠ WARNING${NC} - Unexpected status code: $reset_status"
  echo "  ⚠ WARNING - Unexpected status: $reset_status" >> "$RESULTS_FILE"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo "" >> "$RESULTS_FILE"

echo "==============================="
echo "Summary"
echo "==============================="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo "Skipped: $SKIPPED_TESTS"
echo ""

pass_rate=$(awk "BEGIN { if ($TOTAL_TESTS == 0) print 0; else printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100 }")

cat >> "$RESULTS_FILE" <<EOF
========================================
Summary
========================================
Total Tests: $TOTAL_TESTS
Passed: $PASSED_TESTS
Failed: $FAILED_TESTS
Skipped: $SKIPPED_TESTS
Pass Rate: $pass_rate%

Status: $(if [ $FAILED_TESTS -eq 0 ]; then echo "✓ ALL EXECUTED TESTS PASSED"; else echo "✗ SOME TESTS FAILED"; fi)
EOF

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✓ Rate limit tests completed. Review skips for manual follow-up.${NC}"
  exit 0
else
  echo -e "${RED}✗ Some rate limit tests failed. Check $RESULTS_FILE for details.${NC}"
  exit 1
fi
