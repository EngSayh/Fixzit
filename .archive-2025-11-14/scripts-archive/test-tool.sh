#!/bin/bash
# Simple test script for replace-string-in-file tool

echo "Creating test file..."
cat > test-file.txt << 'EOF'
Simple: hello world
Medium: getData() returns value
Complex: function foo(123, "test") { return bar(456); }
EOF

echo ""
echo "Original content:"
cat test-file.txt
echo ""

echo "=== TEST 1: Simple literal replacement ==="
cp test-file.txt t1.txt
npx tsx scripts/replace-string-in-file.ts --path t1.txt --search "hello" --replace "goodbye"
echo "Result:"
cat t1.txt
rm t1.txt
echo ""

echo "=== TEST 2: Medium regex (function call) ==="
cp test-file.txt t2.txt
npx tsx scripts/replace-string-in-file.ts --path t2.txt --regex --search 'getData\(\)' --replace 'fetchData()'
echo "Result:"
cat t2.txt
rm t2.txt
echo ""

echo "=== TEST 3: Complex regex with capture groups ==="
cp test-file.txt t3.txt
npx tsx scripts/replace-string-in-file.ts --path t3.txt --regex --search 'foo\((\d+), "([^"]+)"\)' --replace 'foo($1, newArg)'
echo "Result:"
cat t3.txt
rm t3.txt
echo ""

# Cleanup
rm test-file.txt

echo "All tests complete!"
