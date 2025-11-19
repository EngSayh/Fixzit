#!/bin/bash

# Load environment variables from .env.local
# This ensures the deployment readiness script has access to all required secrets

set -a  # Automatically export all variables
source .env.local 2>/dev/null || {
  echo "❌ ERROR: .env.local not found"
  echo "Please ensure .env.local exists in the project root"
  exit 1
}
set +a  # Stop auto-exporting

# Verify critical variables are set
REQUIRED_VARS=(
  "MONGODB_URI"
  "NEXTAUTH_SECRET"
  "NEXTAUTH_URL"
)

echo "🔍 Checking required environment variables..."
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
    echo "  ❌ $var is not set"
  else
    echo "  ✅ $var is set"
  fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
  echo ""
  echo "❌ Missing required variables: ${MISSING_VARS[*]}"
  echo "Please configure these in .env.local"
  exit 1
fi

echo ""
echo "✅ All required variables configured"
echo ""
echo "🚀 Running deployment readiness check..."
echo ""

# Run the deployment readiness script
exec ./scripts/verify-deployment-readiness.sh "$@"
