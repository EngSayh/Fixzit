#!/bin/bash
# Comprehensive test suite for replace-string-in-file tool

set -e

echo "🧪 Testing replace-string-in-file tool"
echo "======================================"
echo ""

# Create test file
cat > test-file.txt << 'EOF'
Simple: hello world
Medium: getData() returns value
Complex: function foo(123, "test") { return bar(456); }
Email: user@example.com
Version: 1.2.3
EOF

echo "📄 Original file:"
cat test-file.txt
echo ""

# Test 1: Simple literal replacement
echo "✅ TEST 1: Simple literal replacement"
cp test-file.txt test1.txt
npm run replace:in-file -- --path "test1.txt" --search "hello" --replace "goodbye" > /dev/null 2>&1
grep -q "goodbye world" test1.txt && echo "   PASS: 'hello' → 'goodbye'" || echo "   FAIL"
rm test1.txt

# Test 2: Medium - function call replacement
echo "✅ TEST 2: Medium - function call with regex"
cp test-file.txt test2.txt
npm run replace:in-file -- --path "test2.txt" --regex --search 'getData\(\)' --replace 'fetchData()' > /dev/null 2>&1
grep -q "fetchData()" test2.txt && echo "   PASS: 'getData()' → 'fetchData()'" || echo "   FAIL"
rm test2.txt

# Test 3: Complex - capture groups
echo "✅ TEST 3: Complex - regex with capture groups"
cp test-file.txt test3.txt
npm run replace:in-file -- --path "test3.txt" --regex --search 'foo\((\d+)' --replace 'foo($1, newArg' > /dev/null 2>&1
grep -q "foo(123, newArg" test3.txt && echo "   PASS: Added argument with capture group" || echo "   FAIL"
rm test3.txt

# Test 4: Email replacement with capture groups
echo "✅ TEST 4: Email domain replacement"
cp test-file.txt test4.txt
npm run replace:in-file -- --path "test4.txt" --regex --search '([a-z]+)@example\.com' --replace '$1@newdomain.com' > /dev/null 2>&1
grep -q "user@newdomain.com" test4.txt && echo "   PASS: Email domain changed" || echo "   FAIL"
rm test4.txt

# Test 5: Version number update
echo "✅ TEST 5: Version number with multiple capture groups"
cp test-file.txt test5.txt
npm run replace:in-file -- --path "test5.txt" --regex --search 'Version: (\d+)\.(\d+)\.(\d+)' --replace 'Version: $1.$2.4' > /dev/null 2>&1
grep -q "Version: 1.2.4" test5.txt && echo "   PASS: Version patch number updated" || echo "   FAIL"
rm test5.txt

# Test 6: Word boundary matching
echo "✅ TEST 6: Word boundary matching"
echo "test testing tested" > test6.txt
npm run replace:in-file -- --path "test6.txt" --search "test" --replace "exam" --word-match > /dev/null 2>&1
grep -q "exam testing tested" test6.txt && echo "   PASS: Only whole word 'test' replaced" || echo "   FAIL"
rm test6.txt

# Test 7: Dry-run mode
echo "✅ TEST 7: Dry-run mode (no changes)"
cp test-file.txt test7.txt
npm run replace:in-file -- --path "test7.txt" --search "hello" --replace "goodbye" --dry-run > /dev/null 2>&1
grep -q "hello world" test7.txt && echo "   PASS: File unchanged in dry-run" || echo "   FAIL"
rm test7.txt

# Test 8: Backup creation
echo "✅ TEST 8: Backup file creation"
cp test-file.txt test8.txt
npm run replace:in-file -- --path "test8.txt" --search "hello" --replace "goodbye" --backup > /dev/null 2>&1
[ -f "test8.txt.bak" ] && grep -q "hello world" test8.txt.bak && echo "   PASS: Backup created with original content" || echo "   FAIL"
rm test8.txt test8.txt.bak 2>/dev/null || true

# Test 9: Multiple files with glob
echo "✅ TEST 9: Multiple files with glob pattern"
echo "test content" > test9a.txt
echo "test content" > test9b.txt
npm run replace:in-file -- --path "test9*.txt" --search "test" --replace "exam" > /dev/null 2>&1
grep -q "exam content" test9a.txt && grep -q "exam content" test9b.txt && echo "   PASS: Multiple files updated" || echo "   FAIL"
rm test9a.txt test9b.txt

# Cleanup
rm test-file.txt

echo ""
echo "======================================"
echo "✅ All tests completed!"
echo ""
echo "Usage examples:"
echo "  Simple:  npm run replace:in-file -- --path 'file.txt' --search 'old' --replace 'new'"
echo "  Regex:   npm run replace:in-file -- --path 'file.txt' --regex --search 'pattern' --replace 'replacement'"
echo "  Complex: npm run replace:in-file -- --path 'file.txt' --regex --search 'foo\((\d+)\)' --replace 'bar(\$1)'"
