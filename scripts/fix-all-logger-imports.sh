#!/bin/bash
# Fix ALL missing logger imports identified by TypeScript
set -e

echo "🔧 Fixing ALL missing logger imports (from typecheck errors)..."

# Extract files with logger errors from typecheck
FILES=(
  "components/Guard.tsx"
  "components/SupportPopup.tsx"
  "components/SystemVerifier.tsx"
  "components/TopBar.tsx"
  "components/aqar/PropertyCard.tsx"
  "components/forms/ExampleForm.tsx"
  "components/topbar/GlobalSearch.tsx"
  "components/topbar/QuickActions.tsx"
  "components/ui/select.tsx"
  "components/ui/textarea.tsx"
  "contexts/CurrencyContext.tsx"
  "contexts/TranslationContext.tsx"
  "lib/apiGuard.ts"
  "lib/errors/secureErrorResponse.tsx"
  "lib/fm-auth-middleware.ts"
  "lib/paytabs.ts"
  "lib/secrets.ts"
  "server/lib/authContext.ts"
  "server/lib/rbac.config.ts"
  "server/models/plugins/tenantAudit.ts"
  "server/services/finance/postingService.ts"
)

FIXED=0

for file in "${FILES[@]}"; do
  [ ! -f "$file" ] && continue
  
  # Check if already has import
  if grep -q "import.*logger.*from.*@/lib/logger\\|import.*logger.*from.*'@/lib/logger'\\|import.*logger.*from.*\"@/lib/logger\"" "$file"; then
    continue
  fi
  
  # Check if uses logger
  if ! grep -q "logger\\." "$file"; then
    continue
  fi
  
  echo "→ $file"
  
  # Find last import line
  last_import=$(grep -n "^import " "$file" | tail -1 | cut -d: -f1)
  
  if [ -n "$last_import" ]; then
    sed -i "${last_import}a import { logger } from '@/lib/logger';" "$file"
    FIXED=$((FIXED + 1))
  fi
done

echo "✅ Fixed $FIXED files"
