#!/bin/bash
# Final E2E Verification - Simple and Reliable
# Exit 0 = ALL PASS, Exit 1 = ANY FAIL

PASS=0
FAIL=0

echo "=========================================="
echo "FINAL E2E VERIFICATION"
echo "=========================================="
echo ""

# Test 1: Simple replacement
echo "TEST 1: Simple literal replacement"
echo "hello world" > t1.txt
npx tsx scripts/replace-string-in-file.ts --path t1.txt --search "hello" --replace "goodbye" > /dev/null 2>&1
if grep -q "goodbye world" t1.txt; then
    echo "✅ PASS: Content changed correctly"
    PASS=$((PASS+1))
else
    echo "❌ FAIL: Content not changed"
    FAIL=$((FAIL+1))
fi
rm t1.txt
echo ""

# Test 2: No match should report success=false
echo "TEST 2: No match - should report success=false"
echo "hello world" > t2.txt
OUTPUT=$(npx tsx scripts/replace-string-in-file.ts --path t2.txt --search "NOTFOUND" --replace "something" 2>&1)
if echo "$OUTPUT" | grep -q '"success": false'; then
    echo "✅ PASS: Reports success=false when no matches"
    PASS=$((PASS+1))
else
    echo "❌ FAIL: Should report success=false"
    FAIL=$((FAIL+1))
fi
if grep -q "hello world" t2.txt; then
    echo "✅ PASS: File unchanged when no matches"
    PASS=$((PASS+1))
else
    echo "❌ FAIL: File should be unchanged"
    FAIL=$((FAIL+1))
fi
rm t2.txt
echo ""

# Test 3: Regex with parentheses
echo "TEST 3: Regex - function call with parentheses"
echo "getData() returns value" > t3.txt
npx tsx scripts/replace-string-in-file.ts --path t3.txt --regex --search 'getData\(\)' --replace 'fetchData()' > /dev/null 2>&1
if grep -q "fetchData() returns value" t3.txt; then
    echo "✅ PASS: Regex with parentheses works"
    PASS=$((PASS+1))
else
    echo "❌ FAIL: Regex replacement failed"
    cat t3.txt
    FAIL=$((FAIL+1))
fi
rm t3.txt
echo ""

# Test 4: Capture group $1
echo "TEST 4: Capture group \$1 preservation"
echo 'function foo(123, "test") { }' > t4.txt
npx tsx scripts/replace-string-in-file.ts --path t4.txt --regex --search 'foo\((\d+), "([^"]+)"\)' --replace 'foo($1, newArg)' > /dev/null 2>&1
RESULT=$(cat t4.txt)
if echo "$RESULT" | grep -q "foo(123, newArg)"; then
    echo "✅ PASS: Capture group \$1 (123) preserved correctly"
    PASS=$((PASS+1))
else
    echo "❌ FAIL: Capture group lost"
    echo "Got: $RESULT"
    FAIL=$((FAIL+1))
fi
rm t4.txt
echo ""

# Test 5: Multiple capture groups
echo "TEST 5: Multiple capture groups (\$1 and \$2)"
echo "user@example.com" > t5.txt
npx tsx scripts/replace-string-in-file.ts --path t5.txt --regex --search '([a-z]+)@([a-z]+)\.com' --replace '$1@$2.org' > /dev/null 2>&1
if grep -q "user@example.org" t5.txt; then
    echo "✅ PASS: Both \$1 and \$2 preserved"
    PASS=$((PASS+1))
else
    echo "❌ FAIL: Capture groups not preserved"
    cat t5.txt
    FAIL=$((FAIL+1))
fi
rm t5.txt
echo ""

# Test 6: Dry-run doesn't modify file
echo "TEST 6: Dry-run mode - no file modification"
echo "hello world" > t6.txt
npx tsx scripts/replace-string-in-file.ts --path t6.txt --search "hello" --replace "goodbye" --dry-run > /dev/null 2>&1
if grep -q "hello world" t6.txt; then
    echo "✅ PASS: File unchanged in dry-run mode"
    PASS=$((PASS+1))
else
    echo "❌ FAIL: File was modified in dry-run"
    FAIL=$((FAIL+1))
fi
rm t6.txt
echo ""

# Test 7: Backup creation
echo "TEST 7: Backup file creation"
echo "original content" > t7.txt
npx tsx scripts/replace-string-in-file.ts --path t7.txt --search "original" --replace "modified" --backup > /dev/null 2>&1
if [ -f "t7.txt.bak" ] && grep -q "original content" t7.txt.bak && grep -q "modified content" t7.txt; then
    echo "✅ PASS: Backup created with original content"
    PASS=$((PASS+1))
    rm t7.txt.bak
else
    echo "❌ FAIL: Backup not created correctly"
    FAIL=$((FAIL+1))
fi
rm t7.txt
echo ""

# Test 8: Word boundary
echo "TEST 8: Word boundary matching"
echo "test testing tested" > t8.txt
npx tsx scripts/replace-string-in-file.ts --path t8.txt --search "test" --replace "exam" --word-match > /dev/null 2>&1
if grep -q "exam testing tested" t8.txt; then
    echo "✅ PASS: Only whole word 'test' replaced"
    PASS=$((PASS+1))
else
    echo "❌ FAIL: Word boundary not working"
    cat t8.txt
    FAIL=$((FAIL+1))
fi
rm t8.txt
echo ""

# Test 9: Multiple files
echo "TEST 9: Multiple files with glob"
echo "test" > t9a.txt
echo "test" > t9b.txt
echo "test" > t9c.txt
npx tsx scripts/replace-string-in-file.ts --path "t9*.txt" --search "test" --replace "exam" > /dev/null 2>&1
if grep -q "exam" t9a.txt && grep -q "exam" t9b.txt && grep -q "exam" t9c.txt; then
    echo "✅ PASS: All 3 files modified"
    PASS=$((PASS+1))
else
    echo "❌ FAIL: Not all files modified"
    FAIL=$((FAIL+1))
fi
rm t9*.txt
echo ""

# Test 10: Reports totalReplacements correctly
echo "TEST 10: Accurate replacement count"
echo "foo foo foo" > t10.txt
OUTPUT=$(npx tsx scripts/replace-string-in-file.ts --path t10.txt --search "foo" --replace "bar" 2>&1)
if echo "$OUTPUT" | grep -q '"totalReplacements": 3'; then
    echo "✅ PASS: Reports 3 replacements correctly"
    PASS=$((PASS+1))
else
    echo "❌ FAIL: Replacement count incorrect"
    echo "$OUTPUT" | grep totalReplacements
    FAIL=$((FAIL+1))
fi
rm t10.txt
echo ""

# Final results
echo "=========================================="
echo "RESULTS"
echo "=========================================="
echo "✅ PASSED: $PASS"
echo "❌ FAILED: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "🎉 ALL TESTS PASSED - Tool is 100% accurate!"
    echo ""
    exit 0
else
    echo "⚠️  SOME TESTS FAILED - Tool has issues"
    echo ""
    exit 1
fi
