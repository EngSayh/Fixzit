#!/bin/bash
# Debug script to test replace-string-in-file tool

echo "=========================================="
echo "DEBUG: Testing replace-string-in-file"
echo "=========================================="
echo ""

# Create test file
TEST_FILE="test-debug-file.txt"
echo "original content here" > "$TEST_FILE"

echo "1. Initial file content:"
cat "$TEST_FILE"
echo ""

echo "2. File stats before:"
ls -la "$TEST_FILE"
stat "$TEST_FILE" 2>/dev/null || echo "stat not available"
echo ""

echo "3. Running replace tool..."
npx tsx scripts/replace-string-in-file.ts \
  --path "$TEST_FILE" \
  --search "original" \
  --replace "MODIFIED" 2>&1 | tee replace-output.json
echo ""

echo "4. File content after tool:"
cat "$TEST_FILE"
echo ""

echo "5. File stats after:"
ls -la "$TEST_FILE"
stat "$TEST_FILE" 2>/dev/null || echo "stat not available"
echo ""

echo "6. Checking if file was actually modified:"
if grep -q "MODIFIED" "$TEST_FILE"; then
    echo "✅ SUCCESS: File was modified"
else
    echo "❌ FAILURE: File was NOT modified"
    echo "   Content is still: $(cat $TEST_FILE)"
fi
echo ""

echo "7. Testing with sed (for comparison):"
echo "original content here" > "$TEST_FILE"
sed -i 's/original/MODIFIED/g' "$TEST_FILE"
echo "After sed: $(cat $TEST_FILE)"
echo ""

echo "8. Testing Node.js fs.writeFileSync directly:"
node -e "
const fs = require('fs');
fs.writeFileSync('$TEST_FILE', 'direct write test');
console.log('After direct write:', fs.readFileSync('$TEST_FILE', 'utf8'));
"
echo ""

echo "9. Checking file permissions:"
ls -la "$TEST_FILE"
test -w "$TEST_FILE" && echo "✅ File is writable" || echo "❌ File is NOT writable"
echo ""

echo "10. Checking if file is locked:"
lsof "$TEST_FILE" 2>/dev/null || echo "File is not locked (or lsof not available)"
echo ""

# Cleanup
rm -f "$TEST_FILE" replace-output.json

echo "=========================================="
echo "DEBUG TEST COMPLETE"
echo "=========================================="
