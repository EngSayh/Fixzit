#!/bin/bash
# Test for potential tool issues

echo "=========================================="
echo "Testing replace-string-in-file for issues"
echo "=========================================="
echo ""

# Test 1: Normal case
echo "TEST 1: Normal replacement"
echo "hello world" > test1.txt
echo "Before: $(cat test1.txt)"
npx tsx scripts/replace-string-in-file.ts --path test1.txt --search "hello" --replace "goodbye" > /dev/null 2>&1
echo "After:  $(cat test1.txt)"
if grep -q "goodbye" test1.txt; then
    echo "✅ PASS"
else
    echo "❌ FAIL - File not modified"
fi
rm test1.txt
echo ""

# Test 2: No match case
echo "TEST 2: No match (should not modify)"
echo "hello world" > test2.txt
echo "Before: $(cat test2.txt)"
npx tsx scripts/replace-string-in-file.ts --path test2.txt --search "NOTFOUND" --replace "something" > /dev/null 2>&1
echo "After:  $(cat test2.txt)"
if grep -q "hello world" test2.txt; then
    echo "✅ PASS - File unchanged (correct)"
else
    echo "❌ FAIL - File was modified when it shouldn't be"
fi
rm test2.txt
echo ""

# Test 3: Replace with same value
echo "TEST 3: Replace with same value"
echo "hello world" > test3.txt
echo "Before: $(cat test3.txt)"
npx tsx scripts/replace-string-in-file.ts --path test3.txt --search "hello" --replace "hello" > /dev/null 2>&1
echo "After:  $(cat test3.txt)"
if grep -q "hello world" test3.txt; then
    echo "✅ PASS - File has correct content"
else
    echo "❌ FAIL"
fi
rm test3.txt
echo ""

# Test 4: Multiple replacements
echo "TEST 4: Multiple replacements"
echo "foo foo foo" > test4.txt
echo "Before: $(cat test4.txt)"
OUTPUT=$(npx tsx scripts/replace-string-in-file.ts --path test4.txt --search "foo" --replace "bar" 2>&1)
echo "After:  $(cat test4.txt)"
REPLACEMENTS=$(echo "$OUTPUT" | grep -o '"totalReplacements": [0-9]*' | grep -o '[0-9]*')
echo "Reported replacements: $REPLACEMENTS"
if [ "$REPLACEMENTS" = "3" ] && grep -q "bar bar bar" test4.txt; then
    echo "✅ PASS"
else
    echo "❌ FAIL - Expected 3 replacements and 'bar bar bar'"
fi
rm test4.txt
echo ""

# Test 5: Regex with capture groups
echo "TEST 5: Regex with capture groups"
echo "foo(123)" > test5.txt
echo "Before: $(cat test5.txt)"
npx tsx scripts/replace-string-in-file.ts --path test5.txt --regex --search 'foo\((\d+)\)' --replace 'bar($1)' > /dev/null 2>&1
echo "After:  $(cat test5.txt)"
if grep -q "bar(123)" test5.txt; then
    echo "✅ PASS - Capture group preserved"
else
    echo "❌ FAIL - Expected 'bar(123)', got: $(cat test5.txt)"
fi
rm test5.txt
echo ""

# Test 6: File permissions
echo "TEST 6: File permissions"
echo "test content" > test6.txt
chmod 644 test6.txt
echo "Before: $(cat test6.txt)"
npx tsx scripts/replace-string-in-file.ts --path test6.txt --search "test" --replace "modified" > /dev/null 2>&1
echo "After:  $(cat test6.txt)"
if grep -q "modified" test6.txt; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi
rm test6.txt
echo ""

# Test 7: Verify actual file write
echo "TEST 7: Verify file is actually written"
echo "original" > test7.txt
INODE_BEFORE=$(ls -i test7.txt | awk '{print $1}')
MTIME_BEFORE=$(stat -c %Y test7.txt 2>/dev/null || stat -f %m test7.txt 2>/dev/null)
sleep 1
npx tsx scripts/replace-string-in-file.ts --path test7.txt --search "original" --replace "modified" > /dev/null 2>&1
INODE_AFTER=$(ls -i test7.txt | awk '{print $1}')
MTIME_AFTER=$(stat -c %Y test7.txt 2>/dev/null || stat -f %m test7.txt 2>/dev/null)
echo "Content: $(cat test7.txt)"
echo "Inode before: $INODE_BEFORE, after: $INODE_AFTER"
echo "Mtime before: $MTIME_BEFORE, after: $MTIME_AFTER"
if [ "$MTIME_AFTER" != "$MTIME_BEFORE" ] && grep -q "modified" test7.txt; then
    echo "✅ PASS - File was actually written (mtime changed)"
else
    echo "❌ FAIL - File may not have been written"
fi
rm test7.txt
echo ""

echo "=========================================="
echo "ALL TESTS COMPLETE"
echo "=========================================="
