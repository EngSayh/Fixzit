#!/bin/bash
# Script to systematically convert all jest.mock/jest.fn to vi.mock/vi.fn across test files

set -e

echo "🔄 Converting all test files from Jest to Vitest..."

# Detect sed variant (GNU vs BSD)
if sed --version 2>&1 | grep -q GNU; then
  SED_INPLACE="sed -i"
else
  SED_INPLACE="sed -i ''"
fi

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
    
    # Replace jest APIs with vitest equivalents
    $SED_INPLACE 's/jest\.mock(/vi.mock(/g' "$file"
    $SED_INPLACE 's/jest\.fn/vi.fn/g' "$file"
    $SED_INPLACE 's/jest\.requireMock/vi.mocked/g' "$file"
    $SED_INPLACE 's/jest\.requireActual/vi.importActual/g' "$file"  # ⚠️ Requires 'await'
    $SED_INPLACE 's/jest\.spyOn/vi.spyOn/g' "$file"
    $SED_INPLACE 's/jest\.clearAllMocks/vi.clearAllMocks/g' "$file"
    $SED_INPLACE 's/jest\.resetAllMocks/vi.resetAllMocks/g' "$file"
    $SED_INPLACE 's/jest\.restoreAllMocks/vi.restoreAllMocks/g' "$file"
    $SED_INPLACE 's/jest\.resetModules/vi.resetModules/g' "$file"
    $SED_INPLACE 's/jest\.dontMock/vi.unmock/g' "$file"
    
    # Timer APIs
    $SED_INPLACE 's/jest\.useFakeTimers/vi.useFakeTimers/g' "$file"
    $SED_INPLACE 's/jest\.useRealTimers/vi.useRealTimers/g' "$file"
    $SED_INPLACE 's/jest\.advanceTimersByTime/vi.advanceTimersByTime/g' "$file"
    $SED_INPLACE 's/jest\.runAllTimers/vi.runAllTimers/g' "$file"
    $SED_INPLACE 's/jest\.runOnlyPendingTimers/vi.runOnlyPendingTimers/g' "$file"
    
    # Replace jest.Mock with proper Vitest type
    $SED_INPLACE 's/as jest\.Mock/as ReturnType<typeof vi.fn>/g' "$file"
    $SED_INPLACE 's/: jest\.Mock/: ReturnType<typeof vi.fn>/g' "$file"
    
    count=$((count + 1))
  fi
done

echo "✅ Converted $count test files from Jest to Vitest"
echo "⚠️  Manual review needed for jest.requireMock replacements"
