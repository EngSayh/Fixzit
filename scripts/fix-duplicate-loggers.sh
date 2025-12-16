#!/bin/bash
# Script to fix duplicate logger imports across the entire codebase
# This script will remove all duplicate "import { logger } from '@/lib/logger';" statements
# keeping only the first occurrence in each file

set -e

echo "🔍 Finding all files with duplicate logger imports..."

# Files with duplicate logger imports
FILES_WITH_DUPLICATES=(
  "app/api/billing/subscribe/route.ts"
  "app/api/copilot/chat/route.ts"
  "app/api/health/database/route.ts"
  "app/api/invoices/[id]/route.ts"
  "app/api/marketplace/products/[slug]/route.ts"
  "app/api/projects/[id]/route.ts"
  "app/api/qa/alert/route.ts"
  "app/api/qa/health/route.ts"
  "app/api/qa/log/route.ts"
  "app/api/work-orders/import/route.ts"
)

FIXED_COUNT=0

for file in "${FILES_WITH_DUPLICATES[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 Fixing: $file"
    
    # Create a temporary file
    TEMP_FILE=$(mktemp)
    
    # Process the file: keep first logger import, remove subsequent ones
    awk '
      BEGIN { found_logger = 0 }
      /^import \{ logger \} from .@\/lib\/logger.;?$/ {
        if (found_logger == 0) {
          print
          found_logger = 1
        }
        next
      }
      { print }
    ' "$file" > "$TEMP_FILE"
    
    # Replace original file
    mv "$TEMP_FILE" "$file"
    
    ((FIXED_COUNT++))
    echo "✅ Fixed: $file"
  else
    echo "⚠️  File not found: $file"
  fi
done

echo ""
echo "✨ Fixed $FIXED_COUNT files with duplicate logger imports"
echo "🔍 Verifying no duplicates remain..."

# Verify no files have multiple logger imports
for file in "${FILES_WITH_DUPLICATES[@]}"; do
  if [ -f "$file" ]; then
    COUNT=$(grep -c "^import { logger } from ['@/lib/logger']" "$file" 2>/dev/null || echo "0")
    if [ "$COUNT" -gt 1 ]; then
      echo "❌ Still has duplicates: $file ($COUNT occurrences)"
    fi
  fi
done

echo "✅ Duplicate logger import fix complete!"
