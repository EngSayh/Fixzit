#!/bin/bash
# Script to systematically fix _id → id schema mismatch across codebase
# This aligns MongoDB conventions with Prisma/PostgreSQL architecture

set -e

echo "🔧 Starting systematic schema fix: _id → id"
echo "================================================"

# Define file patterns to process
PATTERNS=(
  "app/marketplace/**/*.tsx"
  "app/finance/**/*.tsx"
  "app/fm/**/*.tsx"
  "app/hr/**/*.tsx"
  "app/support/**/*.tsx"
  "app/notifications/**/*.tsx"
  "app/aqar/**/*.tsx"
  "app/careers/**/*.tsx"
)

TOTAL_FILES=0
TOTAL_REPLACEMENTS=0

# Function to count replacements in a file
count_replacements() {
  local file="$1"
  grep -o "_id" "$file" 2>/dev/null | wc -l
}

# Process each pattern
for pattern in "${PATTERNS[@]}"; do
  echo ""
  echo "📂 Processing: $pattern"
  
  # Find all matching files
  FILES=$(find $(dirname "$pattern") -type f -name "$(basename "$pattern")" 2>/dev/null || true)
  
  if [ -z "$FILES" ]; then
    echo "  ⚠️  No files found"
    continue
  fi
  
  # Process each file
  while IFS= read -r file; do
    if [ ! -f "$file" ]; then
      continue
    fi
    
    # Count occurrences before fix
    count_before=$(count_replacements "$file")
    
    if [ "$count_before" -eq 0 ]; then
      continue
    fi
    
    echo "  📝 Fixing: $file ($count_before occurrences)"
    
    # Create backup
    cp "$file" "$file.bak"
    
    # Apply systematic replacements
    # 1. Interface/type definitions: _id: string → id: string
    sed -i 's/_id: string/id: string/g' "$file"
    sed -i 's/_id: number/id: number/g' "$file"
    sed -i 's/_id?:/id?:/g' "$file"
    
    # 2. React keys: key={item._id} → key={item.id}
    sed -i 's/key={\([a-zA-Z0-9_]*\)\._id}/key={\1.id}/g' "$file"
    
    # 3. String slicing: item._id.slice → item.id.slice
    sed -i 's/\([a-zA-Z0-9_]*\)\._id\.slice/\1.id.slice/g' "$file"
    
    # 4. API routes: ${item._id} → ${item.id}
    sed -i 's/${\([a-zA-Z0-9_]*\)\._id}/${\1.id}/g' "$file"
    
    # 5. Comparisons: item._id === → item.id ===
    sed -i 's/\([a-zA-Z0-9_]*\)\._id ===/\1.id ===/g' "$file"
    sed -i 's/\([a-zA-Z0-9_]*\)\._id !==/\1.id !==/g' "$file"
    sed -i 's/\([a-zA-Z0-9_]*\)\._id ==/\1.id ==/g' "$file"
    sed -i 's/\([a-zA-Z0-9_]*\)\._id !=/\1.id !=/g' "$file"
    
    # 6. Object destructuring: { _id, ... } → { id, ... }
    # (More complex - requires manual review for ambiguous cases)
    
    # Count occurrences after fix
    count_after=$(count_replacements "$file")
    replacements=$((count_before - count_after))
    
    if [ "$replacements" -gt 0 ]; then
      echo "    ✅ Fixed $replacements occurrences"
      TOTAL_REPLACEMENTS=$((TOTAL_REPLACEMENTS + replacements))
      TOTAL_FILES=$((TOTAL_FILES + 1))
      # Remove backup on success
      rm "$file.bak"
    else
      echo "    ⚠️  No changes made (may require manual review)"
      # Restore from backup
      mv "$file.bak" "$file"
    fi
    
  done <<< "$FILES"
done

echo ""
echo "================================================"
echo "✅ Schema fix complete!"
echo "   Files modified: $TOTAL_FILES"
echo "   Total replacements: $TOTAL_REPLACEMENTS"
echo ""
echo "⚠️  IMPORTANT: Review changes before committing:"
echo "   git diff"
echo ""
echo "   Run type checking:"
echo "   pnpm typecheck"
echo ""

# Offer to run type check
read -p "Run type check now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  pnpm typecheck
fi
