#!/bin/bash
# Fix directional Tailwind classes to logical properties for RTL support
# ml-* → ms-*, mr-* → me-*, pl-* → ps-*, pr-* → pe-*, left-* → start-*, right-* → end-*

set -e

echo "🔍 Fixing directional Tailwind classes to logical properties..."
echo ""

# Count occurrences before
BEFORE=$(grep -r --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" -E '\b(ml-|mr-|pl-|pr-)\d+' app/ components/ 2>/dev/null | wc -l || echo "0")
echo "📊 Found $BEFORE instances to fix"
echo ""

# Fix ml-* → ms-* (margin-left → margin-inline-start)
echo "🔧 Fixing ml-* → ms-*..."
find app components -type f \( -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" -o -name "*.js" \) 2>/dev/null -exec sed -i 's/\bml-\([0-9]\)/ms-\1/g' {} + || true

# Fix mr-* → me-* (margin-right → margin-inline-end)
echo "🔧 Fixing mr-* → me-*..."
find app components -type f \( -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" -o -name "*.js" \) 2>/dev/null -exec sed -i 's/\bmr-\([0-9]\)/me-\1/g' {} + || true

# Fix pl-* → ps-* (padding-left → padding-inline-start)
echo "🔧 Fixing pl-* → ps-*..."
find app components -type f \( -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" -o -name "*.js" \) 2>/dev/null -exec sed -i 's/\bpl-\([0-9]\)/ps-\1/g' {} + || true

# Fix pr-* → pe-* (padding-right → padding-inline-end)
echo "🔧 Fixing pr-* → pe-*..."
find app components -type f \( -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" -o -name "*.js" \) 2>/dev/null -exec sed -i 's/\bpr-\([0-9]\)/pe-\1/g' {} + || true

# Fix left-* → start-* (left positioning → inline-start positioning)
echo "🔧 Fixing left-* → start-*..."
find app components -type f \( -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" -o -name "*.js" \) 2>/dev/null -exec sed -i 's/\bleft-\([0-9]\)/start-\1/g' {} + || true

# Fix right-* → end-* (right positioning → inline-end positioning)
echo "🔧 Fixing right-* → end-*..."
find app components -type f \( -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" -o -name "*.js" \) 2>/dev/null -exec sed -i 's/\bright-\([0-9]\)/end-\1/g' {} + || true

# Count occurrences after
AFTER=$(grep -r --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" -E '\b(ml-|mr-|pl-|pr-)\d+' app/ components/ 2>/dev/null | wc -l || echo "0")
FIXED=$((BEFORE - AFTER))

echo ""
echo "✅ Fixed $FIXED instances"
echo "📊 Remaining: $AFTER instances"
echo ""

if [ "$AFTER" -gt 0 ]; then
  echo "⚠️  Note: Some instances remain (may be in RTL conditionals or strings)"
  echo "   Manual review may be needed for complex cases"
fi

echo ""
echo "🎯 Next steps:"
echo "   1. Review changes: git diff app/ components/"
echo "   2. Test RTL layout: Toggle language in app"
echo "   3. Commit changes: git add -A && git commit -m 'fix(ui): Convert directional Tailwind to logical properties'"
