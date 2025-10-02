#!/bin/bash
# Comprehensive Import Checker
# Analyzes all imports in the system and verifies their accuracy

echo "=========================================="
echo "IMPORT ANALYSIS REPORT"
echo "=========================================="
echo ""

# Find all TypeScript/JavaScript files
FILES=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" \
  -not -path "*/playwright-report/*" \
  -not -path "*/test-results/*" \
  -not -path "*/.git/*")

TOTAL_FILES=$(echo "$FILES" | wc -l)
echo "Total files to analyze: $TOTAL_FILES"
echo ""

# Extract all imports
echo "Extracting imports..."
IMPORTS=$(echo "$FILES" | xargs grep -h "^import " 2>/dev/null | sort | uniq)
TOTAL_IMPORTS=$(echo "$IMPORTS" | wc -l)
echo "Total unique import statements: $TOTAL_IMPORTS"
echo ""

# Categorize imports
echo "=========================================="
echo "IMPORT CATEGORIES"
echo "=========================================="
echo ""

# 1. External packages (from node_modules)
echo "1. EXTERNAL PACKAGES (from node_modules)"
echo "-------------------------------------------"
EXTERNAL=$(echo "$IMPORTS" | grep -E "from ['\"]([a-z@][^/'\"]*).*['\"]" | sed -E "s/.*from ['\"]([@a-z][^/'\"]*).*['\"].*/\1/" | sort | uniq)
EXTERNAL_COUNT=$(echo "$EXTERNAL" | grep -v "^$" | wc -l)
echo "Count: $EXTERNAL_COUNT"
echo ""
echo "$EXTERNAL" | head -20
if [ $EXTERNAL_COUNT -gt 20 ]; then
  echo "... and $((EXTERNAL_COUNT - 20)) more"
fi
echo ""

# 2. Relative imports (./  ../)
echo "2. RELATIVE IMPORTS (./ ../)"
echo "-------------------------------------------"
RELATIVE=$(echo "$IMPORTS" | grep -E "from ['\"]\.\.?/" | wc -l)
echo "Count: $RELATIVE"
echo ""

# 3. Absolute imports (@/)
echo "3. ABSOLUTE IMPORTS (@/)"
echo "-------------------------------------------"
ABSOLUTE=$(echo "$IMPORTS" | grep -E "from ['\"]@/" | wc -l)
echo "Count: $ABSOLUTE"
echo ""

# Check for common issues
echo "=========================================="
echo "POTENTIAL ISSUES"
echo "=========================================="
echo ""

# Issue 1: Missing imports (files that import but package not in package.json)
echo "1. Checking against package.json..."
if [ -f "package.json" ]; then
  MISSING_COUNT=0
  while IFS= read -r pkg; do
    if [ -n "$pkg" ] && ! grep -q "\"$pkg\"" package.json; then
      if [ $MISSING_COUNT -eq 0 ]; then
        echo "⚠️  Packages imported but not in package.json:"
      fi
      echo "  - $pkg"
      MISSING_COUNT=$((MISSING_COUNT + 1))
    fi
  done <<< "$EXTERNAL"
  
  if [ $MISSING_COUNT -eq 0 ]; then
    echo "✅ All external packages are in package.json"
  fi
else
  echo "⚠️  package.json not found"
fi
echo ""

# Issue 2: Broken relative imports (files that don't exist)
echo "2. Checking relative imports..."
BROKEN_RELATIVE=0
echo "$FILES" | while read -r file; do
  if [ -f "$file" ]; then
    grep "^import " "$file" 2>/dev/null | grep -E "from ['\"]\.\.?/" | while read -r line; do
      # Extract the path
      import_path=$(echo "$line" | sed -E "s/.*from ['\"](\.\.?\/[^'\"]+)['\"].*/\1/")
      file_dir=$(dirname "$file")
      
      # Resolve the path
      if [[ "$import_path" == ./* ]]; then
        resolved_path="$file_dir/${import_path#./}"
      elif [[ "$import_path" == ../* ]]; then
        resolved_path="$file_dir/$import_path"
      fi
      
      # Check if file exists (try with various extensions)
      if [ -n "$resolved_path" ]; then
        if [ ! -f "$resolved_path" ] && \
           [ ! -f "$resolved_path.ts" ] && \
           [ ! -f "$resolved_path.tsx" ] && \
           [ ! -f "$resolved_path.js" ] && \
           [ ! -f "$resolved_path.jsx" ] && \
           [ ! -f "$resolved_path/index.ts" ] && \
           [ ! -f "$resolved_path/index.tsx" ] && \
           [ ! -f "$resolved_path/index.js" ]; then
          echo "⚠️  Potentially broken: $file"
          echo "    Import: $import_path"
          BROKEN_RELATIVE=$((BROKEN_RELATIVE + 1))
        fi
      fi
    done
done
echo ""

# Issue 3: Duplicate imports in same file
echo "3. Checking for duplicate imports in files..."
DUPLICATE_COUNT=0
echo "$FILES" | while read -r file; do
  if [ -f "$file" ]; then
    DUPS=$(grep "^import " "$file" 2>/dev/null | sort | uniq -d)
    if [ -n "$DUPS" ]; then
      if [ $DUPLICATE_COUNT -eq 0 ]; then
        echo "⚠️  Files with duplicate imports:"
      fi
      echo "  - $file"
      DUPLICATE_COUNT=$((DUPLICATE_COUNT + 1))
    fi
  fi
done
if [ $DUPLICATE_COUNT -eq 0 ]; then
  echo "✅ No duplicate imports found"
fi
echo ""

# Issue 4: Unused imports (basic check - imports that are never referenced)
echo "4. Sample check for potentially unused imports..."
echo "(Checking first 5 files only for performance)"
CHECKED=0
echo "$FILES" | head -5 | while read -r file; do
  if [ -f "$file" ]; then
    CHECKED=$((CHECKED + 1))
    grep "^import " "$file" 2>/dev/null | while read -r line; do
      # Extract imported names
      if echo "$line" | grep -q "import {"; then
        imports=$(echo "$line" | sed -E 's/import \{([^}]+)\}.*/\1/' | tr ',' '\n' | sed 's/^ *//;s/ *$//')
        while IFS= read -r imp; do
          imp_name=$(echo "$imp" | awk '{print $1}')
          if [ -n "$imp_name" ] && [ "$imp_name" != "type" ]; then
            # Count occurrences (excluding the import line itself)
            count=$(grep -c "\b$imp_name\b" "$file" 2>/dev/null || echo "0")
            if [ "$count" -le 1 ]; then
              echo "  ⚠️  Potentially unused: $imp_name in $file"
            fi
          fi
        done <<< "$imports"
      fi
    done
  fi
done
echo ""

# Summary of import patterns
echo "=========================================="
echo "IMPORT PATTERNS SUMMARY"
echo "=========================================="
echo ""
echo "External packages: $EXTERNAL_COUNT"
echo "Relative imports: $RELATIVE"
echo "Absolute imports (@/): $ABSOLUTE"
echo ""

# Top 10 most imported packages
echo "Top 10 Most Imported External Packages:"
echo "---------------------------------------"
echo "$IMPORTS" | grep -E "from ['\"]([a-z@][^/'\"]*).*['\"]" | \
  sed -E "s/.*from ['\"]([@a-z][^/'\"]*).*['\"].*/\1/" | \
  sort | uniq -c | sort -rn | head -10
echo ""

echo "=========================================="
echo "ANALYSIS COMPLETE"
echo "=========================================="
