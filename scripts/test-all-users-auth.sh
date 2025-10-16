#!/bin/bash

# Test authentication for all 14 users

# Read credentials from environment variables (no hardcoded secrets)
API_URL="${API_URL:-http://localhost:3000/api/auth/login}"

# TEST_PASSWORD must be provided via environment variable
if [ -z "$TEST_PASSWORD" ]; then
  echo "❌ ERROR: TEST_PASSWORD environment variable is not set"
  echo "Usage: TEST_PASSWORD='your-password' $0"
  echo "Example: TEST_PASSWORD='Password123' bash scripts/test-all-users-auth.sh"
  exit 1
fi

# Array of test users (using actual DB email addresses)
declare -a USERS=(
  "superadmin@fixzit.co"
  "corp.admin@fixzit.co"
  "property.manager@fixzit.co"
  "dispatcher@fixzit.co"
  "supervisor@fixzit.co"
  "technician@fixzit.co"
  "vendor.admin@fixzit.co"
  "vendor.tech@fixzit.co"
  "tenant@fixzit.co"
  "owner@fixzit.co"
  "finance@fixzit.co"
  "hr@fixzit.co"
  "helpdesk@fixzit.co"
  "auditor@fixzit.co"
)

echo "Testing all 14 users..."
echo ""

PASSED=0
FAILED=0

for email in "${USERS[@]}"; do
  response=$(curl -s --max-time 10 -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$TEST_PASSWORD\"}")
  
  if echo "$response" | grep -q '"token"'; then
    echo "✅ PASSED: $email"
    ((PASSED++))
  else
    error=$(echo "$response" | jq -r '.error // "Unknown error"' 2>/dev/null || echo "Unknown error")
    echo "❌ FAILED: $email - $error"
    ((FAILED++))
  fi
done

echo ""
echo "Summary: $PASSED PASSED, $FAILED FAILED"
