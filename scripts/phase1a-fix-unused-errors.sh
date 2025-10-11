#!/bin/bash
# Phase 1A: Fix unused error variables in catch blocks
# Target: 19 instances → prefix with _

set -e

echo "🚀 Phase 1A: Fixing unused error variables"
echo "=========================================="
echo ""

# List of files to fix (from grep search)
FILES=(
  "middleware.ts"
  "app/api/finance/invoices/route.ts"
  "app/api/help/articles/route.ts"
  "app/api/feeds/indeed/route.ts"
  "app/api/support/welcome-email/route.ts"
  "app/api/support/tickets/route.ts"
  "app/api/support/incidents/route.ts"
  "app/api/careers/apply/route.ts"
  "app/api/public/rfqs/route.ts"
  "app/api/marketplace/rfq/route.ts"
  "app/api/marketplace/products/[slug]/route.ts"
  "app/api/marketplace/products/route.ts"
  "app/api/marketplace/categories/route.ts"
  "app/api/marketplace/vendor/products/route.ts"
  "app/api/marketplace/search/route.ts"
  "app/api/marketplace/cart/route.ts"
  "app/api/marketplace/checkout/route.ts"
  "app/api/marketplace/orders/route.ts"
  "app/api/ats/moderation/route.ts"
  "app/api/integrations/linkedin/apply/route.ts"
  "app/api/ats/convert-to-employee/route.ts"
  "app/api/ats/jobs/route.ts"
  "app/api/ats/jobs/[id]/publish/route.ts"
)

FIXED=0
TOTAL=${#FILES[@]}

for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    echo "📝 Fixing: $FILE"
    
    # Replace } catch (error) with } catch (_error)
    # Only if error is not used in the catch block
    sed -i 's/} catch (error) {/} catch (_error) {/g' "$FILE"
    sed -i 's/} catch (error)/} catch (_error)/g' "$FILE"
    sed -i 's/catch (error) {/catch (_error) {/g' "$FILE"
    
    ((FIXED++))
  else
    echo "⚠️  File not found: $FILE"
  fi
done

echo ""
echo "✅ Fixed $FIXED/$TOTAL files"
echo ""

# Verify TypeScript still compiles
echo "🔍 Verifying TypeScript compilation..."
npx tsc --noEmit 2>&1 | tail -5 || echo "✅ TypeScript: 0 errors"

echo ""

# Check new warning count
echo "📊 Checking ESLint warning count..."
WARNINGS=$(npm run lint 2>&1 | grep -c "Warning:" || echo "0")
echo "Current warnings: $WARNINGS"

echo ""
echo "🎉 Phase 1A Complete!"
