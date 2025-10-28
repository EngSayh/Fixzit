#!/bin/bash
#
# Automated Finance API Routes Fixer - Phase 2
# Applies authorization + AsyncLocalStorage to all finance API routes
#

set -e

echo "🔧 Finance API Routes Auto-Fixer - Phase 2"
echo "=========================================="
echo ""

# Define all finance API route files
ROUTE_FILES=(
  "app/api/finance/accounts/[id]/route.ts"
  "app/api/finance/expenses/route.ts"
  "app/api/finance/expenses/[id]/route.ts"
  "app/api/finance/expenses/[id]/[action]/route.ts"
  "app/api/finance/payments/route.ts"
  "app/api/finance/payments/[id]/[action]/route.ts"
  "app/api/finance/journals/route.ts"
  "app/api/finance/journals/[id]/post/route.ts"
  "app/api/finance/journals/[id]/void/route.ts"
  "app/api/finance/ledger/route.ts"
  "app/api/finance/ledger/trial-balance/route.ts"
  "app/api/finance/ledger/accounts/[id]/activity/route.ts"
)

COUNT=0
TOTAL=${#ROUTE_FILES[@]}

echo "📋 Found $TOTAL routes to update"
echo ""

for file in "${ROUTE_FILES[@]}"; do
  COUNT=$((COUNT + 1))
  
  if [ ! -f "$file" ]; then
    echo "⚠️  [$COUNT/$TOTAL] File not found: $file - SKIPPING"
    continue
  fi
  
  echo "🔄 [$COUNT/$TOTAL] Processing: $file"
  
  # Backup original
  cp "$file" "$file.backup"
  
  # Step 1: Update imports (remove deprecated, add new)
  sed -i 's|import { setTenantContext } from.*tenantIsolation.*||g' "$file"
  sed -i 's|import { setAuditContext } from.*auditPlugin.*||g' "$file"
  sed -i 's|import { setTenantContext, setAuditContext } from.*tenantAudit.*||g' "$file"
  
  # Add new imports if not present
  if ! grep -q "runWithContext" "$file"; then
    sed -i '/from.*@\/server\/middleware\/withAuthRbac/a import { runWithContext } from '\''@/server/lib/authContext'\'';' "$file"
  fi
  
  if ! grep -q "requirePermission" "$file"; then
    sed -i '/from.*@\/server\/lib\/authContext/a import { requirePermission } from '\''@/server/lib/rbac.config'\'';' "$file"
  fi
  
  # Step 2: Remove old setTenantContext/setAuditContext calls
  sed -i '/setTenantContext(/,/);/d' "$file"
  sed -i '/setAuditContext(/,/});/d' "$file"
  
  echo "   ✅ Updated imports and removed deprecated context calls"
done

echo ""
echo "✅ Batch import/context cleanup complete!"
echo ""
echo "⚠️  MANUAL STEPS REQUIRED:"
echo "   1. Add requirePermission() after auth checks in each handler"
echo "   2. Wrap DB operations in runWithContext()"
echo "   3. Review backup files (*.backup) if needed"
echo ""
echo "📝 Next: Run automated test to verify changes"
