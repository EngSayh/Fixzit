#!/bin/bash
# complete-vitest-migration.sh - Fix incomplete Jest→Vitest migrations
# This script completes partial migrations where type assertions were changed but runtime APIs weren't

set -e

echo "🔧 Completing Jest→Vitest migrations in hybrid files..."
echo ""

# List of files with incomplete migrations (type assertions changed but runtime still Jest)
FILES=(
  "app/api/marketplace/categories/route.test.ts"
  "app/marketplace/rfq/page.test.tsx"
  "app/test/api_help_articles_route.test.ts"
  "app/test/help_ai_chat_page.test.tsx"
  "app/test/help_support_ticket_page.test.tsx"
  "server/models/__tests__/Candidate.test.ts"
  "server/security/idempotency.spec.ts"
  "server/work-orders/wo.service.test.ts"
  "tests/unit/components/ErrorBoundary.test.tsx"
)

TOTAL_FIXED=0
TOTAL_FILES=0

for FILE in "${FILES[@]}"; do
  if [ ! -f "$FILE" ]; then
    echo "⚠️  File not found: $FILE"
    continue
  fi
  
  TOTAL_FILES=$((TOTAL_FILES + 1))
  echo "📝 Processing: $FILE"
  
  # Check if file has jest imports/usage
  HAS_JEST=$(grep -c "jest\." "$FILE" 2>/dev/null || true)
  
  if [ "$HAS_JEST" -eq 0 ]; then
    echo "   ✅ No jest.* calls found (already migrated or doesn't use jest)"
    continue
  fi
  
  echo "   Found $HAS_JEST jest.* calls - converting to Vitest..."
  
  # Backup
  cp "$FILE" "$FILE.bak"
  
  # 1. Replace Jest mock creation
  sed -i 's/jest\.fn()/vi.fn()/g' "$FILE"
  sed -i 's/jest\.spyOn(/vi.spyOn(/g' "$FILE"
  
  # 2. Replace Jest mock utilities
  sed -i 's/jest\.mock(/vi.mock(/g' "$FILE"
  sed -i 's/jest\.resetAllMocks()/vi.resetAllMocks()/g' "$FILE"
  sed -i 's/jest\.clearAllMocks()/vi.clearAllMocks()/g' "$FILE"
  sed -i 's/jest\.restoreAllMocks()/vi.restoreAllMocks()/g' "$FILE"
  sed -i 's/jest\.resetModules()/vi.resetModules()/g' "$FILE"
  
  # 3. Replace Jest timers
  sed -i 's/jest\.useFakeTimers()/vi.useFakeTimers()/g' "$FILE"
  sed -i 's/jest\.useRealTimers()/vi.useRealTimers()/g' "$FILE"
  sed -i 's/jest\.advanceTimersByTime(/vi.advanceTimersByTime(/g' "$FILE"
  sed -i 's/jest\.runOnlyPendingTimers()/vi.runOnlyPendingTimers()/g' "$FILE"
  sed -i 's/jest\.setSystemTime(/vi.setSystemTime(/g' "$FILE"
  
  # 4. Replace Jest module mocking
  sed -i 's/jest\.doMock(/vi.doMock(/g' "$FILE"
  sed -i 's/jest\.dontMock(/vi.unmock(/g' "$FILE"
  sed -i 's/jest\.requireActual(/vi.importActual(/g' "$FILE"
  sed -i 's/jest\.requireMock(/vi.importMock(/g' "$FILE"
  
  # Count changes
  AFTER=$(grep -c "jest\." "$FILE" 2>/dev/null || true)
  FIXED=$((HAS_JEST - AFTER))
  TOTAL_FIXED=$((TOTAL_FIXED + FIXED))
  
  echo "   ✅ Converted $FIXED jest.* calls to vi.* ($AFTER remaining)"
  
  if [ "$AFTER" -gt 0 ]; then
    echo "   ⚠️  $AFTER jest.* calls remain (may need manual review):"
    grep -n "jest\." "$FILE" | head -5 || true
  fi
  
  # Remove backup if successful
  rm "$FILE.bak"
done

echo ""
echo "✅ Migration complete!"
echo "   Files processed: $TOTAL_FILES"
echo "   Total jest.* → vi.* conversions: $TOTAL_FIXED"
echo ""
echo "⚠️  Next steps:"
echo "   1. Add Vitest imports to files (import { vi, describe, it, expect } from 'vitest')"
echo "   2. Update file headers to indicate Vitest framework"
echo "   3. Run tests to verify: pnpm test <file> --run"
echo "   4. Check for any remaining jest.* references"
echo ""
echo "Verify with: grep -r 'jest\\.' app/ server/ tests/ --include='*.test.*' --include='*.spec.*' | wc -l"
