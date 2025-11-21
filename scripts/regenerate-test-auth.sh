#!/bin/bash

# =============================================================================
# Regenerate Playwright Test Authentication States
# =============================================================================
# Production-ready: Works with real MongoDB connection and actual user data
# Run this when auth tokens expire or you get 401 errors in Playwright tests
# =============================================================================

set -e

echo "🔐 Regenerating Playwright authentication states (Production-Ready)..."
echo ""

# Check if .env.test exists
if [ ! -f ".env.test" ]; then
  echo "❌ Error: .env.test file not found"
  echo "   Create .env.test with test credentials and MongoDB URI"
  exit 1
fi

# Load environment variables
set -a
source .env.test 2>/dev/null
set +a

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "📋 Configuration:"
echo "   BASE_URL: ${BASE_URL}"
echo "   MONGODB: ${MONGODB_URI:0:30}..."
echo "   OFFLINE: ${ALLOW_OFFLINE_MONGODB:-false}"
echo ""

# Check if app is running
echo "📡 Checking if app is running..."
if ! curl -sf --max-time 5 "${BASE_URL}" > /dev/null 2>&1; then
  echo "❌ App not running. Start with:"
  echo "   MONGODB_URI=mongodb://localhost:27017/fixzit_test pnpm dev"
  exit 1
fi

echo "✅ App is running"
echo ""

mkdir -p tests/state

# Run auth setup
echo "🔄 Running authentication setup..."
if command -v pnpm &> /dev/null; then
  NODE_OPTIONS="--no-warnings" pnpm exec tsx tests/setup-auth.ts
else
  NODE_OPTIONS="--no-warnings" npx tsx tests/setup-auth.ts
fi

EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ Setup failed! Check:"
  echo "  • Test users exist in MongoDB"
  echo "  • Credentials in .env.test are correct"
  echo "  • NEXTAUTH_SECRET matches dev server"
  exit $EXIT_CODE
fi

echo ""
echo "📋 Verifying state files..."
echo ""

ROLES=("superadmin" "admin" "manager" "technician" "tenant" "vendor")
ALL_VALID=true

for role in "${ROLES[@]}"; do
  FILE="tests/state/${role}.json"
  if [ -f "$FILE" ]; then
    SIZE=$(stat -f%z "$FILE" 2>/dev/null || stat -c%s "$FILE" 2>/dev/null)
    if [ "$SIZE" -gt 100 ]; then
      echo "✅ ${role}.json (${SIZE} bytes)"
    else
      echo "⚠️  ${role}.json too small"
      ALL_VALID=false
    fi
  else
    echo "❌ ${role}.json NOT FOUND"
    ALL_VALID=false
  fi
done

echo ""

if [ "$ALL_VALID" = true ]; then
  echo "✅ Authentication states regenerated successfully!"
  echo ""
  echo "Run tests with:"
  echo "  pnpm playwright test --project='Desktop:EN:Admin'"
else
  echo "⚠️  Some states are invalid. Check app logs."
  exit 1
fi
