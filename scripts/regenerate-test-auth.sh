#!/bin/bash

# =============================================================================
# Regenerate Playwright Test Authentication States
# =============================================================================
# This script regenerates the auth state files in tests/state/
# Run this when:
# - Test auth tokens expire
# - Test user credentials change
# - You get 401 errors in Playwright tests
# =============================================================================

set -e

echo "🔐 Regenerating Playwright authentication states..."
echo ""

# Check if .env.test exists
if [ ! -f ".env.test" ]; then
  echo "❌ Error: .env.test file not found"
  echo "   Create .env.test with test user credentials"
  echo "   See .env.example for reference"
  exit 1
fi

# Load environment variables
export $(grep -v '^#' .env.test | xargs)

# Ensure the app is running
echo "📡 Checking if app is running on ${BASE_URL:-http://localhost:3000}..."
if ! curl -s "${BASE_URL:-http://localhost:3000}" > /dev/null; then
  echo "❌ Error: App is not running"
  echo ""
  echo "   Start the app first:"
  echo "   pnpm dev"
  echo ""
  echo "   Or in another terminal:"
  echo "   ALLOW_OFFLINE_MONGODB=true SKIP_ENV_VALIDATION=true pnpm dev"
  exit 1
fi

echo "✅ App is running"
echo ""

# Create state directory if it doesn't exist
mkdir -p tests/state

# Run the global setup to regenerate auth states
echo "🔄 Running auth setup..."
echo ""

NODE_OPTIONS="--no-warnings" npx playwright test --config tests/playwright.config.ts \
  --grep "@auth-setup" \
  || echo "⚠️  Auth setup may have failed, but checking state files..."

# Alternative: directly run the setup script
if [ -f "tests/setup-auth.ts" ]; then
  echo ""
  echo "🔄 Running setup-auth.ts directly..."
  NODE_OPTIONS="--no-warnings" tsx tests/setup-auth.ts
fi

echo ""
echo "📋 Checking generated state files..."
echo ""

# Verify state files were created
ROLES=("superadmin" "admin" "manager" "technician" "tenant" "vendor")
ALL_EXIST=true

for role in "${ROLES[@]}"; do
  STATE_FILE="tests/state/${role}.json"
  if [ -f "$STATE_FILE" ]; then
    SIZE=$(wc -c < "$STATE_FILE" | tr -d ' ')
    if [ "$SIZE" -gt 100 ]; then
      echo "✅ ${role}.json (${SIZE} bytes)"
    else
      echo "⚠️  ${role}.json exists but seems too small (${SIZE} bytes)"
      ALL_EXIST=false
    fi
  else
    echo "❌ ${role}.json - NOT FOUND"
    ALL_EXIST=false
  fi
done

echo ""

if [ "$ALL_EXIST" = true ]; then
  echo "✅ All authentication states regenerated successfully!"
  echo ""
  echo "You can now run Playwright tests:"
  echo "  pnpm playwright test"
  echo "  pnpm playwright test --project='Desktop:EN:Admin'"
  echo "  pnpm playwright test tests/specs/smoke.spec.ts"
else
  echo "⚠️  Some authentication states are missing or invalid"
  echo ""
  echo "Troubleshooting:"
  echo "1. Check that test users exist in your database"
  echo "2. Verify credentials in .env.test are correct"
  echo "3. Ensure OTP dev mode is enabled in your app"
  echo "4. Check app logs for authentication errors"
  exit 1
fi
