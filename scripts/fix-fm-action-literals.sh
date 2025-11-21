#!/bin/bash
#
# Fix FM Action String Literals - Replace with FMAction enum
# Fixes security issue: permission action string literals should use enums
#

set -e

FIXZIT_ROOT="/Users/eng.sultanalhassni/Downloads/Fixzit/Fixzit"
cd "$FIXZIT_ROOT"

echo "🔧 Fixing FM Action String Literals..."
echo ""

# Find all FM route files with action string literals
FILES=$(find app/api/fm -name "*.ts" -type f -exec grep -l "action: ['\"]" {} \;)

for file in $FILES; do
  echo "Processing: $file"
  
  # Check if FMAction import already exists
  if ! grep -q "import.*FMAction.*from.*@/types/fm/enums" "$file"; then
    # Add import after other domain/fm imports or at the start of imports
    if grep -q "import.*from.*@/domain/fm/fm.behavior" "$file"; then
      # Add after fm.behavior import
      sed -i.bak "/import.*from.*@\/domain\/fm\/fm.behavior/a\\
import { FMAction } from '@/types/fm/enums';
" "$file"
    else
      # Add at the beginning (after first import)
      sed -i.bak "1,/^import/ s/\(^import.*$\)/\1\\
import { FMAction } from '@\/types\/fm\/enums';/" "$file"
    fi
  fi
  
  # Replace string literals with enum values
  sed -i.bak "s/action: 'view'/action: FMAction.VIEW/g" "$file"
  sed -i.bak "s/action: \"view\"/action: FMAction.VIEW/g" "$file"
  sed -i.bak "s/action: 'create'/action: FMAction.CREATE/g" "$file"
  sed -i.bak "s/action: \"create\"/action: FMAction.CREATE/g" "$file"
  sed -i.bak "s/action: 'update'/action: FMAction.UPDATE/g" "$file"
  sed -i.bak "s/action: \"update\"/action: FMAction.UPDATE/g" "$file"
  sed -i.bak "s/action: 'delete'/action: FMAction.DELETE/g" "$file"
  sed -i.bak "s/action: \"delete\"/action: FMAction.DELETE/g" "$file"
  sed -i.bak "s/action: 'export'/action: FMAction.EXPORT/g" "$file"
  sed -i.bak "s/action: \"export\"/action: FMAction.EXPORT/g" "$file"
  sed -i.bak "s/action: 'assign'/action: FMAction.ASSIGN/g" "$file"
  sed -i.bak "s/action: \"assign\"/action: FMAction.ASSIGN/g" "$file"
  
  # Remove backup files
  rm -f "${file}.bak"
done

echo ""
echo "✅ Fixed $(echo "$FILES" | wc -l) files"
echo ""
echo "Files updated:"
echo "$FILES"
