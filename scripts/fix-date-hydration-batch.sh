#!/bin/bash
# Date Hydration File Existence Check
# Verifies that all date hydration target files exist

# Strict mode: exit on error, undefined variables, pipe failures
set -euo pipefail
IFS=$'\n\t'

# Compute script directory and change to repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.." || exit 1

echo "🔍 Checking Date Hydration Target Files"
echo "========================================"
echo "📁 Working directory: $PWD"
echo ""

CHECKED=0
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
    echo "  ✓ Verified: $file"
    ((CHECKED+=1))
  else
    echo "  ✗ Missing: $file"
    ((ERRORS+=1))
  fi
done

echo ""
echo "📊 Summary"
echo "  Checked: $CHECKED files"
echo "  Missing: $ERRORS files"

# Safely check for remaining files list
REMAINING_FILE="/tmp/date-hydration-files.txt"
if [ -f "$REMAINING_FILE" ]; then
  REMAINING_COUNT=$(wc -l < "$REMAINING_FILE" 2>/dev/null || echo "0")
  echo "  Remaining: $REMAINING_COUNT total files"
else
  echo "  Remaining: 0 total files (list not generated)"
fi
