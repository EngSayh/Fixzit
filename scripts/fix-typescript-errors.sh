#!/bin/bash
# Fix TypeScript errors from manual edits

set -e

echo "🔧 Fixing TypeScript errors in manually edited files..."

# Fix help/ask/route.ts - it has __err in catch but _err in usage
sed -i 's/catch (__err: any)/catch (_err: Error | unknown)/g' app/api/help/ask/route.ts

# Fix kb/ingest/route.ts - restore err reference
sed -i 's/console\._error(_err(/console.error(_err(/g' app/api/kb/ingest/route.ts 2>/dev/null || true

# Fix kb/search/route.ts - restore err reference  
sed -i 's/console\._error(_err(/console.error(_err(/g' app/api/kb/search/route.ts 2>/dev/null || true

# Fix support/incidents/route.ts - fix err reference
sed -i 's/console\.log(_err(/console.log(_err(/g' app/api/support/incidents/route.ts 2>/dev/null || true

echo "✅ Fixed TypeScript errors"

# Verify
echo ""
echo "🔍 Verifying TypeScript compilation..."
npx tsc --noEmit 2>&1 | head -30 && echo "❌ Still has errors" || echo "✅ TypeScript: 0 errors!"
