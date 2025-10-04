#!/bin/bash
# Convert Jest syntax to Vitest syntax across all test files

echo "Converting Jest to Vitest syntax..."

# Find all test files
find . -type f \( -name "*.test.ts" -o -name "*.test.tsx" \) | while read file; do
  echo "Processing: $file"
  
  # Check if file has jest references
  if grep -q "jest\." "$file" || grep -q "from '@testing-library/jest-dom'" "$file"; then
    # Add vitest import if not already present
    if ! grep -q "from 'vitest'" "$file"; then
      # Add vi import at the top
      sed -i '1i import { vi } from '\''vitest'\'';' "$file"
    fi
    
    # Convert jest.mock to vi.mock
    sed -i 's/jest\.mock(/vi.mock(/g' "$file"
    
    # Convert jest.fn to vi.fn
    sed -i 's/jest\.fn(/vi.fn(/g' "$file"
    
    # Convert jest.spyOn to vi.spyOn
    sed -i 's/jest\.spyOn(/vi.spyOn(/g' "$file"
    
    # Convert jest.Mock type
    sed -i 's/: jest\.Mock</: ReturnType<typeof vi.fn></g' "$file"
    
    # Remove @testing-library/jest-dom import
    sed -i '/^import.*@testing-library\/jest-dom/d' "$file"
    
    echo "  ✓ Converted $file"
  fi
done

echo ""
echo "Checking for remaining jest references..."
remaining=$(grep -r "jest\." --include="*.test.ts" --include="*.test.tsx" . 2>/dev/null | wc -l)
echo "Found $remaining remaining jest references"
