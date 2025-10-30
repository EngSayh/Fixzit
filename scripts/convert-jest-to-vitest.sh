#!/bin/bash
# Script to systematically convert all jest.mock/jest.fn to vi.mock/vi.fn across test files

set -e

echo "🔄 Converting all test files from Jest to Vitest..."

# Find all test files
test_files=$(find . -type f \( -name "*.test.ts" -o -name "*.test.tsx" \) ! -path "*/node_modules/*" ! -path "*/.git/*")

count=0
for file in $test_files; do
  if grep -q "jest\." "$file" 2>/dev/null; then
    echo "Converting: $file"
    
    # Add vi import if needed
    if ! grep -q "import.*vi.*from.*vitest" "$file"; then
      # Insert after any existing imports but before first non-import line
      awk '/^import/ {p=1} p==1 && !/^import/ && !/^$/ {print "import { vi } from '\''vitest'\'';"; p=0} 1' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
    fi
    
    # Replace jest.mock with vi.mock
    sed -i 's/jest\.mock(/vi.mock(/g' "$file"
    
    # Replace jest.fn with vi.fn  
    sed -i 's/jest\.fn/vi.fn/g' "$file"
    
    # Replace jest.requireMock with import (requires manual review)
    sed -i 's/jest\.requireMock/vi.mocked/g' "$file"
    
    # Replace jest.spyOn with vi.spyOn
    sed -i 's/jest\.spyOn/vi.spyOn/g' "$file"
    
    # Replace jest.clearAllMocks with vi.clearAllMocks
    sed -i 's/jest\.clearAllMocks/vi.clearAllMocks/g' "$file"
    
    # Replace jest.resetAllMocks with vi.resetAllMocks
    sed -i 's/jest\.resetAllMocks/vi.resetAllMocks/g' "$file"
    
    # Replace jest.restoreAllMocks with vi.restoreAllMocks
    sed -i 's/jest\.restoreAllMocks/vi.restoreAllMocks/g' "$file"
    
    # Replace jest.Mock with vi.Mock
    sed -i 's/jest\.Mock/vi.Mock/g' "$file"
    
    count=$((count + 1))
  fi
done

echo "✅ Converted $count test files from Jest to Vitest"
echo "⚠️  Manual review needed for jest.requireMock replacements"
