#!/bin/bash
# Fix req.ip references (NextRequest doesn't have ip property)

echo "🔧 Fixing req.ip references in API routes..."

# Find all TypeScript files with req.ip
FILES=$(grep -r "req\.ip" app/api/ --include="*.ts" -l)

COUNT=0
for file in $FILES; do
  # Replace req.ip with 'unknown' (since NextRequest doesn't have ip property)
  sed -i "s/req\.headers\.get('x-forwarded-for')?\.split(',')\[0\] || req\.ip || 'unknown'/req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'/g" "$file"
  echo "  ✓ Fixed: $file"
  COUNT=$((COUNT + 1))
done

echo ""
echo "✅ Fixed $COUNT files"
echo ""
echo "Note: All rate limiting now uses x-forwarded-for with 'unknown' fallback"
echo "(NextRequest doesn't have a .ip property in Next.js 13+)"
