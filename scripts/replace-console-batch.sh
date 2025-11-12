#!/bin/bash
# Replace console.error with logger.error in batches
set -e

echo "🔄 Batch replacing console.error with logger.error"
echo ""

# Files to process (batch 1 - server files)
FILES=(
  "server/security/ip-utils.ts"
  "server/copilot/audit.ts"
  "server/middleware/withAuthRbac.ts"
  "server/middleware/subscriptionCheck.ts"
  "server/utils/errorResponses.ts"
)

REPLACED=0

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    
    # Check if logger is already imported
    if ! grep -q "import.*logger.*from.*@/lib/logger" "$file"; then
      echo "  → Adding logger import"
      # Add logger import after first import
      sed -i "1a import { logger } from '@/lib/logger';" "$file"
    fi
    
    # Replace console.error patterns
    COUNT=$(grep -c "console\.error" "$file" 2>/dev/null || echo 0)
    if [ "$COUNT" -gt 0 ]; then
      echo "  → Replacing $COUNT console.error statements"
      
      # Pattern 1: console.error('message:', error)
      sed -i "s/console\.error('\([^']*\):', \([^)]*\));/logger.error('\1', { error: \2 });/g" "$file"
      
      # Pattern 2: console.error(`message ${var}`, error)
      sed -i "s/console\.error(\`\([^\`]*\)\`, \([^)]*\));/logger.error(\`\1\`, { error: \2 });/g" "$file"
      
      # Pattern 3: console.error('message', { ... })
      sed -i "s/console\.error('\([^']*\)', {/logger.error('\1', {/g" "$file"
      
      # Pattern 4: console.error(\`message\`)
      sed -i "s/console\.error(\`\([^\`]*\)\`);/logger.error(\`\1\`);/g" "$file"
      
      # Pattern 5: console.error('simple message')
      sed -i "s/console\.error('\([^']*\)');/logger.error('\1');/g" "$file"
      
      REPLACED=$((REPLACED + COUNT))
    fi
    
    echo "  ✓ Done"
  else
    echo "⚠️  File not found: $file"
  fi
  echo ""
done

echo "✅ Replaced $REPLACED console.error statements"
echo ""
echo "Next: Run 'pnpm typecheck' to verify"
