#!/bin/bash

# Batch API Routes Enhancement Script
# Systematically enhances all API routes with:
# - Rate limiting
# - OpenAPI 3.0 documentation  
# - Standardized error handling
# - Security headers

set -e

echo "🚀 Starting batch API routes enhancement..."
echo "================================================"

# Configuration
TOTAL_ROUTES=109
CURRENT_ENHANCED=9
BATCH_SIZE=10
COMMIT_EVERY=5

# Track progress
ROUTES_THIS_SESSION=0
ROUTES_THIS_COMMIT=0

# Get list of all routes, excluding already enhanced ones
ENHANCED_ROUTES=(
  "app/api/auth/login/route.ts"
  "app/api/auth/signup/route.ts"
  "app/api/auth/me/route.ts"
  "app/api/auth/logout/route.ts"
  "app/api/payments/create/route.ts"
  "app/api/marketplace/rfq/route.ts"
  "app/api/subscribe/corporate/route.ts"
  "app/api/subscribe/owner/route.ts"
)

# Get all route files
ALL_ROUTES=$(find app/api -name "route.ts" -type f | sort)

echo "📊 Status:"
echo "  - Total routes: $TOTAL_ROUTES"
echo "  - Already enhanced: $CURRENT_ENHANCED"
echo "  - Remaining: $((TOTAL_ROUTES - CURRENT_ENHANCED))"
echo ""

# Function to check if route is already enhanced
is_enhanced() {
  local route=$1
  for enhanced in "${ENHANCED_ROUTES[@]}"; do
    if [[ "$route" == "$enhanced" ]]; then
      return 0
    fi
  done
  return 1
}

# Function to check if file has our enhancements
has_enhancements() {
  local file=$1
  
  # Check for rate limiting
  if ! grep -q "rateLimit" "$file"; then
    return 1
  fi
  
  # Check for OpenAPI docs
  if ! grep -q "@openapi" "$file"; then
    return 1
  fi
  
  # Check for createSecureResponse
  if ! grep -q "createSecureResponse" "$file"; then
    return 1
  fi
  
  return 0
}

# Priority routing - process in order
P0_ROUTES=(
  "app/api/work-orders/route.ts"
  "app/api/properties/route.ts"
  "app/api/projects/route.ts"
  "app/api/vendors/route.ts"
  "app/api/assets/route.ts"
  "app/api/invoices/route.ts"
  "app/api/finance/invoices/route.ts"
)

echo "🎯 Processing P0 critical routes first..."
echo ""

for route in "${P0_ROUTES[@]}"; do
  if [[ -f "$route" ]] && ! is_enhanced "$route" && ! has_enhancements "$route"; then
    echo "✅ $route needs enhancement"
    # Note: Actual enhancement would be done via Node.js script
    ((ROUTES_THIS_SESSION++))
  fi
done

echo ""
echo "📝 Summary:"
echo "  - Routes identified for enhancement: $ROUTES_THIS_SESSION"
echo "  - Estimated time: $((ROUTES_THIS_SESSION * 2)) minutes"
echo ""
echo "💡 Next steps:"
echo "  1. Run Node.js enhancement script for each route"
echo "  2. Commit in batches of $COMMIT_EVERY routes"
echo "  3. Push after each commit for incremental review"
echo ""
echo "✨ Ready to proceed with automated enhancement!"
