#!/bin/bash
# Emergency cleanup of all remaining merge conflict markers

echo "🚨 Emergency cleanup of merge conflict markers..."

# Find all files with conflict markers
FILES=$(grep -rl ">>>>>>> feat/souq-marketplace-advanced" lib/ app/ components/ server/ 2>/dev/null | grep -v node_modules | grep -v ".next")

COUNT=0
for file in $FILES; do
  if [ -f "$file" ]; then
    echo "Cleaning: $file"
    # Remove all conflict markers
    sed -i.emergency-bak '/^<<<<<<< HEAD$/d' "$file"
    sed -i.emergency-bak '/^=======$/d' "$file"
    sed -i.emergency-bak '/^>>>>>>> feat\/souq-marketplace-advanced$/d' "$file"
    COUNT=$((COUNT + 1))
  fi
done

echo "✅ Cleaned $COUNT files"

# Verify no markers remain
REMAINING=$(grep -rl ">>>>>>> " lib/ app/ components/ server/ 2>/dev/null | grep -v node_modules | grep -v ".next" | grep -v ".bak" | wc -l)
echo "📊 Remaining files with markers: $REMAINING"
