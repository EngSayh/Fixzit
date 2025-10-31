#!/bin/bash
# Phase 7B: Systematic brand token replacement script
# Replaces all brand-* tokens with semantic design system tokens

set -e

echo "🎨 Starting Phase 7B: Brand Token Sweep"
echo "========================================"
echo ""

# Color mapping patterns
declare -A REPLACEMENTS=(
  # Primary brand colors
  ["bg-brand-500"]="bg-primary"
  ["text-brand-500"]="text-primary"
  ["border-brand-500"]="border-primary"
  ["ring-brand-500"]="ring-primary"
  
  # Hover states
  ["hover:bg-brand-600"]="hover:bg-primary/90"
  ["hover:text-brand-600"]="hover:text-primary"
  ["hover:text-brand-700"]="hover:text-primary"
  
  # Light variants
  ["bg-brand-50"]="bg-primary/5"
  ["bg-brand-100"]="bg-primary/10"
  ["text-brand-100"]="text-primary-foreground"
  
  # Dark variants
  ["bg-brand-900"]="bg-primary"
  ["bg-brand-950"]="bg-primary"
  ["text-brand-900"]="text-primary"
  
  # Medium variants
  ["text-brand-600"]="text-primary"
  ["text-brand-700"]="text-primary"
  ["text-brand-400"]="text-primary/80"
  
  # File input specific
  ["file:bg-brand-50"]="file:bg-primary/5"
  ["file:text-brand-700"]="file:text-primary"
  ["hover:file:bg-brand-100"]="hover:file:bg-primary/10"
  
  # Focus states
  ["focus:ring-brand-500"]="focus:ring-primary"
  ["focus:ring-brand-600"]="focus:ring-primary"
)

# Files to process (excluding .old backups and node_modules)
FILES=$(find . -type f \( -name "*.tsx" -o -name "*.ts" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/dist/*" \
  -not -name "*.old.*" \
  -exec grep -l "brand-" {} \; 2>/dev/null)

if [ -z "$FILES" ]; then
  echo "✅ No brand tokens found! All done."
  exit 0
fi

echo "📝 Found $(echo "$FILES" | wc -l) files with brand tokens"
echo ""

# Process each file
for file in $FILES; do
  echo "🔧 Processing: $file"
  
  # Create backup
  cp "$file" "$file.backup"
  
  # Apply replacements
  for pattern in "${!REPLACEMENTS[@]}"; do
    replacement="${REPLACEMENTS[$pattern]}"
    # Escape slashes for sed
    escaped_pattern=$(echo "$pattern" | sed 's/\//\\\//g')
    escaped_replacement=$(echo "$replacement" | sed 's/\//\\\//g')
    
    # Platform-specific sed (BSD/macOS vs GNU/Linux)
    if sed --version >/dev/null 2>&1; then
      # GNU sed (Linux)
      sed -i "s/$escaped_pattern/$escaped_replacement/g" "$file"
    else
      # BSD sed (macOS) - requires backup extension
      sed -i.bak "s/$escaped_pattern/$escaped_replacement/g" "$file"
      rm -f "$file.bak"
    fi
  done
  
  # Check if file changed
  if diff -q "$file" "$file.backup" > /dev/null 2>&1; then
    # No changes, remove backup
    rm "$file.backup"
  else
    echo "   ✓ Updated $(diff "$file.backup" "$file" | grep -c "^<" || echo 0) occurrences"
    rm "$file.backup"
  fi
done

echo ""
echo "✅ Phase 7B Complete!"
echo ""
echo "📊 Verification:"
REMAINING=$(grep -r --include="*.tsx" --include="*.ts" -E "(text-brand-|bg-brand-|border-brand-|ring-brand-)" . 2>/dev/null | grep -v "\.old\." | grep -v "fix-brand-tokens.sh" | wc -l || echo 0)
echo "   Remaining brand tokens: $REMAINING"

if [ "$REMAINING" -eq 0 ]; then
  echo "   🎉 All brand tokens successfully replaced!"
else
  echo "   ⚠️  Some tokens may need manual review"
  echo ""
  echo "   Remaining occurrences:"
  grep -r --include="*.tsx" --include="*.ts" -E "(text-brand-|bg-brand-|border-brand-|ring-brand-)" . 2>/dev/null | grep -v "\.old\." | grep -v "fix-brand-tokens.sh" | head -10
fi

echo ""
echo "🔍 Next steps:"
echo "   1. Review changes: git diff"
echo "   2. Test components: pnpm dev"
echo "   3. Run typecheck: pnpm typecheck"
echo "   4. Commit: git add -A && git commit -m 'fix: replace all brand tokens with semantic tokens (Phase 7B)'"
