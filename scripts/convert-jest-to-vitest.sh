#!/bin/bash
# Script to systematically convert all jest.mock/jest.fn to vi.mock/vi.fn across test files

set -e

echo "🔄 Converting all test files from Jest to Vitest..."

# Detect sed variant (GNU vs BSD) and create portable sed_inplace function
if sed --version 2>&1 | grep -q GNU; then
  sed_inplace() {
    sed -i "$@"
  }
else
  sed_inplace() {
    sed -i '' "$@"
  }
fi

# Find all test files
test_files=$(find . -type f \( -name "*.test.ts" -o -name "*.test.tsx" \) ! -path "*/node_modules/*" ! -path "*/.git/*")

count=0
for file in $test_files; do
  if grep -q "jest\." "$file" 2>/dev/null; then
    echo "Converting: $file"
    
    # Add vi import if needed
    if ! grep -q "import.*vi.*from.*vitest" "$file"; then
      # Compute insertion point: after shebang/leading comments and existing imports
      # Read file to find correct insertion line
      insert_line=$(awk '
        BEGIN { insert_after = 0; found_imports = 0; }
        NR == 1 && /^#!/ { insert_after = NR; next; }
        /^\/\// || /^\/\*/ { insert_after = NR; next; }
        /^import/ { found_imports = 1; insert_after = NR; next; }
        found_imports && !/^import/ && !/^$/ { print insert_after; exit; }
        !found_imports && !/^#!/ && !/^\/\// && !/^\/\*/ && !/^$/ { print insert_after; exit; }
        END { if (insert_after > 0) print insert_after; else print 0; }
      ' "$file")
      
      if [ "$insert_line" -gt 0 ]; then
        # Insert after computed line
        sed_inplace "${insert_line}a\\
import { vi } from 'vitest';" "$file"
      else
        # Prepend to file if no suitable location found
        echo "import { vi } from 'vitest';" | cat - "$file" > "$file.tmp" && mv "$file.tmp" "$file"
      fi
    fi
    
    # Replace jest APIs with vitest equivalents
    sed_inplace 's/jest\.mock(/vi.mock(/g' "$file"
    sed_inplace 's/jest\.fn/vi.fn/g' "$file"
    # jest.requireMock -> vi.mocked is incorrect (vi.mocked is TS helper, not runtime)
    # Flag for manual review instead
    if grep -q "jest\.requireMock" "$file"; then
      echo "  ⚠️  WARNING: $file contains jest.requireMock - manual conversion required (use vi.mock with factory)"
    fi
    # jest.requireActual -> vi.importActual requires await - flag for manual review
    if grep -q "jest\.requireActual" "$file"; then
      echo "  ⚠️  WARNING: $file contains jest.requireActual - manual conversion required (use await vi.importActual())"
    fi
    sed_inplace 's/jest\.spyOn/vi.spyOn/g' "$file"
    sed_inplace 's/jest\.clearAllMocks/vi.clearAllMocks/g' "$file"
    sed_inplace 's/jest\.resetAllMocks/vi.resetAllMocks/g' "$file"
    sed_inplace 's/jest\.restoreAllMocks/vi.restoreAllMocks/g' "$file"
    sed_inplace 's/jest\.resetModules/vi.resetModules/g' "$file"
    sed_inplace 's/jest\.dontMock/vi.unmock/g' "$file"
    
    # Timer APIs
    sed_inplace 's/jest\.useFakeTimers/vi.useFakeTimers/g' "$file"
    sed_inplace 's/jest\.useRealTimers/vi.useRealTimers/g' "$file"
    sed_inplace 's/jest\.advanceTimersByTime/vi.advanceTimersByTime/g' "$file"
    sed_inplace 's/jest\.runAllTimers/vi.runAllTimers/g' "$file"
    sed_inplace 's/jest\.runOnlyPendingTimers/vi.runOnlyPendingTimers/g' "$file"
    
    # Replace jest.Mock with proper Vitest type
    sed_inplace 's/as jest\.Mock/as ReturnType<typeof vi.fn>/g' "$file"
    sed_inplace 's/: jest\.Mock/: ReturnType<typeof vi.fn>/g' "$file"
    
    count=$((count + 1))
  fi
done

echo "✅ Converted $count test files from Jest to Vitest"
echo "⚠️  Manual review needed for jest.requireMock replacements"
