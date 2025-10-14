#!/bin/bash
# Automated script to replace jest.Mock with Vitest equivalents
# Part of: SYSTEM_WIDE_JEST_VITEST_FIXES.md - Phase 1 (P0)

set -e

echo "🔧 Fixing jest.Mock type assertions..."
echo ""

# Files to fix
FILES=(
  "tests/unit/components/ErrorBoundary.test.tsx"
  "server/security/idempotency.spec.ts"
  "server/work-orders/wo.service.test.ts"
  "server/models/__tests__/Candidate.test.ts"
  "app/test/help_ai_chat_page.test.tsx"
  "app/test/api_help_articles_route.test.ts"
  "app/test/help_support_ticket_page.test.tsx"
)

TOTAL_FIXED=0

for FILE in "${FILES[@]}"; do
  if [ ! -f "$FILE" ]; then
    echo "⚠️  File not found: $FILE"
    continue
  fi
  
  echo "📝 Processing: $FILE"
  
  # Count occurrences before
  BEFORE=$(grep -c "as jest\.Mock" "$FILE" || true)
  
  if [ "$BEFORE" -eq 0 ]; then
    echo "   ✅ No jest.Mock found (already fixed or doesn't use it)"
    continue
  fi
  
  # Replace patterns
  # 1. Simple cast: as jest.Mock
  sed -i 's/as jest\.Mock/as ReturnType<typeof vi.fn>/g' "$FILE"
  
  # 2. Unknown cast: as unknown as jest.Mock
  sed -i 's/as unknown as jest\.Mock/as ReturnType<typeof vi.fn>/g' "$FILE"
  
  # 3. Generic cast: jest.Mock<...>
  # This is more complex, so we'll handle it manually if needed
  
  # Count occurrences after
  AFTER=$(grep -c "as jest\.Mock" "$FILE" || true)
  FIXED=$((BEFORE - AFTER))
  TOTAL_FIXED=$((TOTAL_FIXED + FIXED))
  
  echo "   ✅ Fixed $FIXED occurrence(s) (${BEFORE} → ${AFTER} remaining)"
  
  if [ "$AFTER" -gt 0 ]; then
    echo "   ⚠️  Some jest.Mock patterns remain (likely generic types)"
    grep -n "jest\.Mock" "$FILE" || true
  fi
done

echo ""
echo "✅ Total jest.Mock assertions fixed: $TOTAL_FIXED"
echo ""
echo "🧪 Run tests to verify:"
echo "   pnpm test tests/unit/components/ErrorBoundary.test.tsx --run"
echo "   pnpm test server/security/idempotency.spec.ts --run"
echo "   pnpm test server/work-orders/wo.service.test.ts --run"
echo ""
echo "📊 Verify no jest.Mock remains:"
echo "   grep -r 'as jest\.Mock' tests/ server/ app/ --include='*.ts' --include='*.tsx' | grep -v node_modules"
