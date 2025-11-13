#!/bin/bash
# Fix missing logger imports - addresses CodeRabbit PR #289 comments
set -e

echo "🔧 Fixing missing logger imports..."
echo ""

# List of files that reference logger but don't import it
FILES=(
  "components/ErrorBoundary.tsx"
  "components/CopilotWidget.tsx"
  "components/auth/LoginForm.tsx"
  "components/auth/GoogleSignInButton.tsx"
  "components/aqar/ViewingScheduler.tsx"
  "components/finance/TrialBalanceReport.tsx"
  "components/finance/JournalEntryForm.tsx"
  "components/finance/AccountActivityViewer.tsx"
  "components/marketplace/ProductCard.tsx"
  "components/marketplace/PDPBuyBox.tsx"
  "components/marketplace/CheckoutForm.tsx"
  "components/i18n/CompactLanguageSelector.tsx"
  "app/api/admin/logo/upload/route.ts"
)

FIXED=0

for file in "${FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "⚠️  File not found: $file"
    continue
  fi
  
  # Check if logger import already exists
  if grep -q "import.*logger.*from.*@/lib/logger" "$file"; then
    echo "✓ $file - already has logger import"
    continue
  fi
  
  # Check if file actually uses logger
  if ! grep -q "logger\\.\\(error\\|warn\\|info\\|debug\\)" "$file"; then
    echo "○ $file - doesn't use logger, skipping"
    continue
  fi
  
  echo "→ $file - adding logger import"
  
  # Find the last import statement line number
  last_import_line=$(grep -n "^import " "$file" | tail -1 | cut -d: -f1)
  
  if [ -n "$last_import_line" ]; then
    # Insert after last import
    sed -i "${last_import_line}a import { logger } from '@/lib/logger';" "$file"
    echo "  ✓ Added after line $last_import_line"
    FIXED=$((FIXED + 1))
  else
    # No imports found, add after 'use client' directive if present
    if head -1 "$file" | grep -q "'use client'"; then
      sed -i "2a\\nimport { logger } from '@/lib/logger';" "$file"
      echo "  ✓ Added after 'use client'"
      FIXED=$((FIXED + 1))
    else
      # Add at top of file
      sed -i "1i import { logger } from '@/lib/logger';" "$file"
      echo "  ✓ Added at top of file"
      FIXED=$((FIXED + 1))
    fi
  fi
done

echo ""
echo "✅ Fixed $FIXED files"
echo ""
echo "Next: Fix incorrect logger.error usage (wrapped objects)"
