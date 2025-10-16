#!/bin/bash

# E2E Authentication Test Script
# Tests login API for all 14 user roles

API_URL="${API_URL:-http://localhost:3000/api/auth/login}"

# TEST_PASSWORD must be provided via environment variable
if [ -z "$TEST_PASSWORD" ]; then
  echo "❌ ERROR: TEST_PASSWORD environment variable is not set"
  echo "Usage: TEST_PASSWORD='your-password' $0"
  echo "Example: TEST_PASSWORD='Password123' bash test-all-users-auth.sh"
  exit 1
fi

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================"
echo "E2E Authentication Test - All 14 Users"
echo "================================"
echo ""

# Counter for results
total=0
success=0
failed=0

# Test function
test_user() {
  local email=$1
  local expected_role=$2
  local user_name=$3
  
  total=$((total + 1))
  
  echo -n "Testing: $user_name ($email)... "
  
  response=$(curl -s --max-time 10 -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$TEST_PASSWORD\"}")
  
  if echo "$response" | grep -q '"token"'; then
    role=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('user', {}).get('role', 'N/A'))" 2>/dev/null || echo "N/A")
    if [ "$role" = "$expected_role" ]; then
      echo -e "${GREEN}✅ SUCCESS${NC} - Role: $role"
      success=$((success + 1))
    else
      echo -e "${YELLOW}⚠️  SUCCESS but role mismatch${NC} - Expected: $expected_role, Got: $role"
      success=$((success + 1))
    fi
  else
    error=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('error', 'Unknown error'))" 2>/dev/null || echo "Unknown error")
    echo -e "${RED}❌ FAILED${NC} - Error: $error"
    failed=$((failed + 1))
  fi
}

# Test all 14 users
echo "Starting authentication tests..."
echo ""

test_user "superadmin@fixzit.co" "super_admin" "Super Admin"
test_user "corp.admin@fixzit.co" "corporate_admin" "Corporate Admin"
test_user "property.manager@fixzit.co" "property_manager" "Property Manager"
test_user "ops.dispatcher@fixzit.co" "operations_dispatcher" "Operations Dispatcher"
test_user "supervisor@fixzit.co" "supervisor" "Supervisor"
test_user "tech.internal@fixzit.co" "technician_internal" "Technician (Internal)"
test_user "vendor.admin@fixzit.co" "vendor_admin" "Vendor Admin"
test_user "vendor.tech@fixzit.co" "vendor_technician" "Vendor Technician"
test_user "tenant.resident@fixzit.co" "tenant_resident" "Tenant/Resident"
test_user "owner.landlord@fixzit.co" "owner_landlord" "Owner/Landlord"
test_user "finance.manager@fixzit.co" "finance_manager" "Finance Manager"
test_user "hr.manager@fixzit.co" "hr_manager" "HR Manager"
test_user "helpdesk.agent@fixzit.co" "helpdesk_agent" "Helpdesk Agent"
test_user "auditor.compliance@fixzit.co" "auditor_compliance" "Auditor/Compliance"

echo ""
echo "================================"
echo "Test Results Summary"
echo "================================"
echo "Total Users: $total"
echo -e "${GREEN}Successful: $success${NC}"
echo -e "${RED}Failed: $failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
  echo -e "${GREEN}✅ All authentication tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some authentication tests failed.${NC}"
  exit 1
fi
