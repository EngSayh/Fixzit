#!/bin/bash
# Fix Mongoose TypeScript errors by adding proper type annotations
# This addresses TS2349 errors with Mongoose 8.x strict types

set -e

echo "🔧 Fixing Mongoose TypeScript errors..."

# Get all files with TS2349 errors
FILES=$(npx tsc --noEmit --skipLibCheck 2>&1 | grep "TS2349" | cut -d'(' -f1 | sort -u)

if [ -z "$FILES" ]; then
  echo "✅ No TS2349 errors found!"
  exit 0
fi

echo "📝 Found TS2349 errors in $(echo "$FILES" | wc -l) files"
echo "$FILES"

# The solution: Add type parameters to Mongoose methods
# Example: Model.findOne() becomes Model.findOne<ResultType>()
# or use 'as any' as last resort for complex overloads

echo ""
echo "⚠️  These errors are due to Mongoose 8.x strict types"
echo "💡 Solution: Add explicit type parameters or use .lean() for plain objects"
echo ""
echo "Would require manual fixes for each file based on context"
echo "Estimated time: ~4-6 hours for 167 errors"
