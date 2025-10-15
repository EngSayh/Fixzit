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
  
  # 1. Replace Jest mock creation (using portable .bak extension)
  sed -i.tmp 's/jest\.fn()/vi.fn()/g' "$FILE" && mv "$FILE.tmp" "$FILE" 2>/dev/null || true
  sed -i.tmp 's/jest\.spyOn(/vi.spyOn(/g' "$FILE" && mv "$FILE.tmp" "$FILE" 2>/dev/null || true
  
  # 2. Replace Jest mock utilities
  sed -i.tmp 's/jest\.mock(/vi.mock(/g' "$FILE" && mv "$FILE.tmp" "$FILE" 2>/dev/null || true
  sed -i.tmp 's/jest\.resetAllMocks()/vi.resetAllMocks()/g' "$FILE" && mv "$FILE.tmp" "$FILE" 2>/dev/null || true
  sed -i.tmp 's/jest\.clearAllMocks()/vi.clearAllMocks()/g' "$FILE" && mv "$FILE.tmp" "$FILE" 2>/dev/null || true
  sed -i.tmp 's/jest\.restoreAllMocks()/vi.restoreAllMocks()/g' "$FILE" && mv "$FILE.tmp" "$FILE" 2>/dev/null || true
  sed -i.tmp 's/jest\.resetModules()/vi.resetModules()/g' "$FILE" && mv "$FILE.tmp" "$FILE" 2>/dev/null || true
  
  # 3. Replace Jest timers
  sed -i.tmp 's/jest\.useFakeTimers()/vi.useFakeTimers()/g' "$FILE" && mv "$FILE.tmp" "$FILE" 2>/dev/null || true
  sed -i.tmp 's/jest\.useRealTimers()/vi.useRealTimers()/g' "$FILE" && mv "$FILE.tmp" "$FILE" 2>/dev/null || true
  sed -i.tmp 's/jest\.advanceTimersByTime(/vi.advanceTimersByTime(/g' "$FILE" && mv "$FILE.tmp" "$FILE" 2>/dev/null || true
  sed -i.tmp 's/jest\.runOnlyPendingTimers()/vi.runOnlyPendingTimers()/g' "$FILE" && mv "$FILE.tmp" "$FILE" 2>/dev/null || true
  sed -i.tmp 's/jest\.setSystemTime(/vi.setSystemTime(/g' "$FILE" && mv "$FILE.tmp" "$FILE" 2>/dev/null || true
  
  # 4. Replace Jest module mocking
  sed -i.tmp 's/jest\.doMock(/vi.doMock(/g' "$FILE" && mv "$FILE.tmp" "$FILE" 2>/dev/null || true
  sed -i.tmp 's/jest\.dontMock(/vi.unmock(/g' "$FILE" && mv "$FILE.tmp" "$FILE" 2>/dev/null || true
  sed -i.tmp 's/jest\.requireActual(/vi.importActual(/g' "$FILE" && mv "$FILE.tmp" "$FILE" 2>/dev/null || true
  # NOTE: jest.requireMock → vi.importMock is DEPRECATED and returns Promise
  # Skip automatic conversion - must be handled manually
  # sed -i.tmp 's/jest\.requireMock(/vi.importMock(/g' "$FILE" && mv "$FILE.tmp" "$FILE" 2>/dev/null || true
  
  # Count changes
  AFTER=$(grep -c "jest\." "$FILE" 2>/dev/null || true)
  FIXED=$((HAS_JEST - AFTER))
  TOTAL_FIXED=$((TOTAL_FIXED + FIXED))
  
  echo "   ✅ Converted $FIXED jest.* calls to vi.* ($AFTER remaining)"
  
  if [ "$AFTER" -gt 0 ]; then
    echo "   ⚠️  $AFTER jest.* calls remain (may need manual review):"
    grep -n "jest\." "$FILE" | head -5 || true
    echo "   📋 Backup preserved at: $FILE.bak (for manual review)"
  else
    # Only remove backup if no manual review needed
    rm "$FILE.bak"
    echo "   ✨ Backup removed (migration complete)"
  fi
done

echo ""
echo "✅ Migration complete!"
echo "   Files processed: $TOTAL_FILES"
echo "   Total jest.* → vi.* conversions: $TOTAL_FIXED"
echo ""
echo "⚠️  Next steps:"
echo "   1. Add Vitest imports to files (import { vi, describe, it, expect } from 'vitest')"
echo "   2. Update file headers to indicate Vitest framework"
echo "   3. ⚠️  IMPORTANT: jest.requireMock requires manual handling"
echo "      - vi.importMock is DEPRECATED and returns a Promise"
echo "      - Replace with synchronous vi.mock patterns or convert to async if needed"
echo "   4. Run tests to verify: pnpm test <file> --run"
echo "   5. Check for any remaining jest.* references"
echo ""
echo "Verify with: grep -r 'jest\\.' app/ server/ tests/ --include='*.test.*' --include='*.spec.*' | wc -l"
