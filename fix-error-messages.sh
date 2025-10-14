#!/bin/bash
# Script to fix error.message exposure in API routes

set -e

# Parse command line arguments
DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "� DRY RUN MODE - No files will be modified"
fi

echo "�🔒 Fixing error message exposure in API routes..."

count=0
fixed=0

# Use NUL-separated output to safely handle filenames with spaces
while IFS= read -r -d '' file; do
  count=$((count + 1))
  
  # Check if file contains error.message pattern
  if grep -q "error\.message" "$file"; then
    echo "  📝 Fixing: $file"
    
    if [[ "$DRY_RUN" == true ]]; then
      echo "    [DRY RUN] Would replace error.message patterns"
      continue
    fi
    
    # Create backup
    cp "$file" "${file}.bak"
    
    # Pattern 1: const message = error instanceof Error ? error.message : 'Default message';
    # Replace with: const message = 'Default message';
    sed -i.bak1 -E "s/const message = error instanceof Error \? error\.message : ('([^']+)'|\"([^\"]+)\");/const message = \1;/g" "$file"
    
    # Pattern 2: error instanceof Error ? error.message : String(error)
    # Replace with: 'An unexpected error occurred'
    sed -i.bak2 -E "s/error instanceof Error \? error\.message : (String\(error\)|'Unknown error')/\"An unexpected error occurred\"/g" "$file"
    
    # Verify that sed succeeded and file changed
    if ! diff -q "$file" "${file}.bak" >/dev/null 2>&1; then
      # File changed successfully
      rm -f "${file}.bak" "${file}.bak1" "${file}.bak2"
      fixed=$((fixed + 1))
    else
      # No changes made, restore backup
      mv "${file}.bak" "$file"
      rm -f "${file}.bak1" "${file}.bak2"
      echo "    ⚠️  No changes applied to $file"
    fi
  fi
done < <(find app/api -name "*.ts" -type f -print0)

echo ""
echo "✅ Complete! Checked $count files, fixed $fixed files"
echo ""
echo "⚠️  IMPORTANT: Review changes and test thoroughly"
echo "   Some errors may need custom messages"
