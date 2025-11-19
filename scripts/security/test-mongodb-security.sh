#!/bin/bash
#
# MongoDB Security Test Script
# Tests MongoDB URI validation and Atlas enforcement
#
# Usage: ./scripts/security/test-mongodb-security.sh
#

set -e

RESULTS_FILE="./qa/security/mongodb-test-results.log"
mkdir -p ./qa/security

echo "🔒 MongoDB Security Test"
echo "==============================="
echo "Results: $RESULTS_FILE"
echo ""

# Initialize results
cat > "$RESULTS_FILE" <<EOF
MongoDB Security Test Results
Generated: $(date)
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

# Save original env
ORIG_MONGODB_URI="${MONGODB_URI}"
ORIG_NODE_ENV="${NODE_ENV}"

# Test MongoDB connection with different URIs
test_mongodb_uri() {
  local uri="$1"
  local node_env="$2"
  local should_succeed="$3"
  local description="$4"
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  echo "Test $TOTAL_TESTS: $description"
  echo "  NODE_ENV: $node_env"
  echo "  MONGODB_URI: ${uri:0:50}..."
  echo "Test $TOTAL_TESTS: $description" >> "$RESULTS_FILE"
  echo "  NODE_ENV: $node_env" >> "$RESULTS_FILE"
  echo "  MONGODB_URI: ${uri:0:50}..." >> "$RESULTS_FILE"
  
  # Run validator via tsx to reuse application logic
  set +e
  output=$(NODE_ENV="$node_env" MONGODB_URI="$uri" pnpm tsx scripts/security/mongodb-uri-check.ts 2>&1)
  status=$?
  set -e
  
  # Evaluate result
  if [ "$should_succeed" = "true" ]; then
    if [ $status -eq 0 ]; then
      echo -e "  ${GREEN}✓ PASS${NC} - Connection validated successfully"
      echo "  ✓ PASS - Connection validated" >> "$RESULTS_FILE"
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      echo -e "  ${RED}✗ FAIL${NC} - Should succeed but failed: $output"
      echo "  ✗ FAIL - Should succeed but failed" >> "$RESULTS_FILE"
      echo "  Error: $output" >> "$RESULTS_FILE"
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
  else
    if [ $status -ne 0 ]; then
      echo -e "  ${GREEN}✓ PASS${NC} - Correctly rejected: $(echo "$output" | tr '\\n' ' ')"
      echo "  ✓ PASS - Correctly rejected" >> "$RESULTS_FILE"
      echo "  Error: $output" >> "$RESULTS_FILE"
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      echo -e "  ${RED}✗ FAIL${NC} - Should be rejected but succeeded"
      echo "  ✗ FAIL - Should be rejected but succeeded" >> "$RESULTS_FILE"
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
  fi
  
  echo "" >> "$RESULTS_FILE"
  echo ""
}

# Test 1: Atlas URI in production (should succeed)
echo "Testing Production Mode:"
test_mongodb_uri \
  "mongodb+srv://user:pass@cluster.mongodb.net/fixzit" \
  "production" \
  "true" \
  "Atlas URI in production (mongodb+srv://)"

# Test 2: Localhost in production (should fail)
test_mongodb_uri \
  "mongodb://localhost:27017/fixzit" \
  "production" \
  "false" \
  "Localhost in production (should be rejected)"

# Test 3: 127.0.0.1 in production (should fail)
test_mongodb_uri \
  "mongodb://127.0.0.1:27017/fixzit" \
  "production" \
  "false" \
  "127.0.0.1 in production (should be rejected)"

# Test 4: Self-hosted (non-Atlas) in production (should fail)
test_mongodb_uri \
  "mongodb://db.example.com:27017/fixzit" \
  "production" \
  "false" \
  "Self-hosted (non-Atlas) in production"

# Test 5: Missing URI in production (should fail)
echo "Test $((TOTAL_TESTS + 1)): Missing MONGODB_URI in production"
echo "Test $((TOTAL_TESTS + 1)): Missing MONGODB_URI in production" >> "$RESULTS_FILE"
set +e
output=$(NODE_ENV="production" pnpm tsx scripts/security/mongodb-uri-check.ts 2>&1)
status=$?
set -e

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $status -ne 0 ]; then
  echo -e "  ${GREEN}✓ PASS${NC} - Correctly rejected missing URI"
  echo "  ✓ PASS - Correctly rejected" >> "$RESULTS_FILE"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "  ${RED}✗ FAIL${NC} - Should reject missing URI"
  echo "  ✗ FAIL - Should reject missing URI" >> "$RESULTS_FILE"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo "" >> "$RESULTS_FILE"
echo ""

# Test 6: Localhost in development (should succeed with fallback)
echo "Testing Development Mode:"
test_mongodb_uri \
  "" \
  "development" \
  "true" \
  "Missing URI in development (should use localhost fallback)"

# Test 7: Atlas URI in development (should succeed)
test_mongodb_uri \
  "mongodb+srv://user:pass@cluster.mongodb.net/fixzit" \
  "development" \
  "true" \
  "Atlas URI in development"

# Test 8: Localhost in development (should succeed)
test_mongodb_uri \
  "mongodb://localhost:27017/fixzit" \
  "development" \
  "true" \
  "Explicit localhost in development"

# Restore original env
export MONGODB_URI="${ORIG_MONGODB_URI}"
export NODE_ENV="${ORIG_NODE_ENV}"

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

Status: $(if [ $FAILED_TESTS -eq 0 ]; then echo "✓ ALL TESTS PASSED"; else echo "✗ SOME TESTS FAILED"; fi)

Security Assessment:
- Atlas-only enforcement: $(if [ $FAILED_TESTS -eq 0 ]; then echo "✓ Working"; else echo "✗ Issues detected"; fi)
- Production validation: $(if [ $FAILED_TESTS -eq 0 ]; then echo "✓ Working"; else echo "✗ Issues detected"; fi)
- Development fallbacks: $(if [ $FAILED_TESTS -eq 0 ]; then echo "✓ Working"; else echo "✗ Issues detected"; fi)
EOF

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✓ All MongoDB security tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. Check $RESULTS_FILE for details.${NC}"
  exit 1
fi
