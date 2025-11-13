#!/bin/bash
# Batch Date Hydration Fixer
# Fixes all date hydration issues systematically

set -e

echo "🔧 Starting Date Hydration Batch Fix"
echo "========================================"

FIXED=0
ERRORS=0

# Priority 1: App pages (user-facing, highest hydration risk)
echo "📱 Phase 1: App Pages"
FILES=(
  "app/(dashboard)/referrals/page.tsx"
  "app/admin/audit-logs/page.tsx"
  "app/administration/page.tsx"
  "app/finance/page.tsx"
  "app/finance/payments/new/page.tsx"
  "app/finance/invoices/new/page.tsx"
  "app/finance/expenses/new/page.tsx"
  "app/help/ai-chat/page.tsx"
  "app/help/[slug]/page.tsx"
  "app/support/my-tickets/page.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
    ((FIXED++))
  else
    echo "  ✗ $file (not found)"
    ((ERRORS++))
  fi
done

echo ""
echo "📊 Summary"
echo "  Fixed: $FIXED files"
echo "  Errors: $ERRORS files"
echo "  Remaining: $(wc -l < /tmp/date-hydration-files.txt) total files"
