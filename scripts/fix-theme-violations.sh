#!/bin/bash

# Script to fix theme violations across the codebase
# Replaces hardcoded Tailwind colors with semantic tokens

echo "🎨 Fixing theme violations..."

# Function to fix a file
fix_file() {
  local file="$1"
  echo "Fixing: $file"
  
  # Replace bg-white with bg-card (for cards/panels)
  sed -i 's/bg-white /bg-card /g' "$file"
  sed -i 's/bg-white"/bg-card"/g' "$file"
  
  # Replace bg-gray-50 with bg-muted
  sed -i 's/bg-gray-50 /bg-muted /g' "$file"
  sed -i 's/bg-gray-50"/bg-muted"/g' "$file"
  
  # Replace bg-gray-100 with bg-muted
  sed -i 's/bg-gray-100 /bg-muted /g' "$file"
  sed -i 's/bg-gray-100"/bg-muted"/g' "$file"
  
  # Replace border-gray-200 with border-border
  sed -i 's/border-gray-200 /border-border /g' "$file"
  sed -i 's/border-gray-200"/border-border"/g' "$file"
  
  # Replace border-gray-300 with border-border
  sed -i 's/border-gray-300 /border-border /g' "$file"
  sed -i 's/border-gray-300"/border-border"/g' "$file"
  
  # Replace text-gray-900 with text-foreground
  sed -i 's/text-gray-900 /text-foreground /g' "$file"
  sed -i 's/text-gray-900"/text-foreground"/g' "$file"
  
  # Replace text-gray-600 with text-muted-foreground
  sed -i 's/text-gray-600 /text-muted-foreground /g' "$file"
  sed -i 's/text-gray-600"/text-muted-foreground"/g' "$file"
  
  # Replace text-gray-500 with text-muted-foreground
  sed -i 's/text-gray-500 /text-muted-foreground /g' "$file"
  sed -i 's/text-gray-500"/text-muted-foreground"/g' "$file"
  
  # Replace text-gray-400 with text-muted-foreground
  sed -i 's/text-gray-400 /text-muted-foreground /g' "$file"
  sed -i 's/text-gray-400"/text-muted-foreground"/g' "$file"
  
  # Replace rounded-lg with rounded-2xl for card-like elements (be selective)
  # Only replace in Card, div with border, modals
  sed -i 's/className=".*Card.*rounded-lg/&-2xl/g' "$file"
}

# Find all TSX files and fix them
find app components -name "*.tsx" -type f | while read -r file; do
  # Check if file has violations
  if grep -q "bg-white\|bg-gray-\|border-gray-\|text-gray-" "$file"; then
    fix_file "$file"
  fi
done

echo "✅ Theme violations fixed!"
echo "⚠️  Please review changes and test thoroughly"
