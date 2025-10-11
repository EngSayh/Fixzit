#!/bin/bash
# Script to fix error.message exposure in API routes

set -e

echo "🔒 Fixing error message exposure in API routes..."

# Find all TypeScript files in app/api directory
api_files=$(find app/api -name "*.ts" -type f)

count=0
fixed=0

for file in $api_files; do
  count=$((count + 1))
  
  # Check if file contains error.message pattern
  if grep -q "error\.message" "$file"; then
    echo "  📝 Fixing: $file"
    
    # Pattern 1: const message = error instanceof Error ? error.message : 'Default message';
    # Replace with: const message = 'Default message';
    sed -i.bak -E "s/const message = error instanceof Error \? error\.message : ('([^']+)'|\"([^\"]+)\");/const message = \1;/g" "$file"
    
    # Pattern 2: error instanceof Error ? error.message : String(error)
    # Replace with: 'An unexpected error occurred'
    sed -i.bak2 -E "s/error instanceof Error \? error\.message : (String\(error\)|'Unknown error')/\"An unexpected error occurred\"/g" "$file"
    
    # Pattern 3: Return statements with error.message
    # Example: return createSecureResponse({ error: error.message }, 400, req);
    # Replace with: return createSecureResponse({ error: 'Bad request' }, 400, req);
    
    # Remove backup files
    rm -f "${file}.bak" "${file}.bak2"
    
    fixed=$((fixed + 1))
  fi
done

echo ""
echo "✅ Complete! Checked $count files, fixed $fixed files"
echo ""
echo "⚠️  IMPORTANT: Review changes and test thoroughly"
echo "   Some errors may need custom messages"
