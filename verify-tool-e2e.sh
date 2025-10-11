#!/bin/bash
# End-to-End Verification Script
# Tests replace-string-in-file tool with precise pass/fail criteria
# Exit code 0 = ALL PASS, Exit code 1 = ANY FAIL

set -e  # Exit on any error

PASS_COUNT=0
FAIL_COUNT=0
TOTAL_TESTS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function test_case() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$expected" = "$actual" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
        PASS_COUNT=$((PASS_COUNT + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name"
        echo "  Expected: $expected"
        echo "  Actual:   $actual"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        return 1
    fi
}

function test_json_field() {
    local json="$1"
    local field="$2"
    local expected="$3"
    local test_name="$4"
    
    local actual=$(echo "$json" | grep "\"$field\":" | head -1 | sed 's/.*: \(.*\),\?/\1/' | tr -d ' "')
    test_case "$test_name" "$expected" "$actual"
}

echo "=========================================="
echo "E2E VERIFICATION: replace-string-in-file"
echo "=========================================="
echo ""

# Create test file
cat > test-verify.txt << 'EOF'
Simple: hello world
Medium: getData() returns value
Complex: function foo(123, "test") { return bar(456); }
Email: user@example.com
Version: 1.2.3
EOF

echo "Original test file created:"
cat test-verify.txt
echo ""

# ============================================
# TEST 1: Simple Literal Replacement
# ============================================
echo "TEST 1: Simple Literal Replacement"
echo "-----------------------------------"
cp test-verify.txt t1.txt
OUTPUT=$(npx tsx scripts/replace-string-in-file.ts --path t1.txt --search "hello" --replace "goodbye" 2>&1)
RESULT=$(cat t1.txt)

test_json_field "$OUTPUT" "success" "true" "T1.1: success=true"
test_json_field "$OUTPUT" "totalReplacements" "1" "T1.2: totalReplacements=1"
test_case "T1.3: Content changed correctly" "Simple: goodbye world" "$(echo "$RESULT" | head -1)"

rm t1.txt
echo ""

# ============================================
# TEST 2: No Match (Should Report Failure)
# ============================================
echo "TEST 2: No Match - Should Report success=false"
echo "-----------------------------------------------"
cp test-verify.txt t2.txt
OUTPUT=$(npx tsx scripts/replace-string-in-file.ts --path t2.txt --search "NONEXISTENT" --replace "something" 2>&1)
RESULT=$(cat t2.txt)

test_json_field "$OUTPUT" "success" "false" "T2.1: success=false when no matches"
test_json_field "$OUTPUT" "totalReplacements" "0" "T2.2: totalReplacements=0"
test_case "T2.3: File unchanged" "Simple: hello world" "$(echo "$RESULT" | head -1)"

rm t2.txt
echo ""

# ============================================
# TEST 3: Medium Regex - Function Call
# ============================================
echo "TEST 3: Medium Regex - Function Call"
echo "-------------------------------------"
cp test-verify.txt t3.txt
OUTPUT=$(npx tsx scripts/replace-string-in-file.ts --path t3.txt --regex --search 'getData\(\)' --replace 'fetchData()' 2>&1)
RESULT=$(cat t3.txt)

test_json_field "$OUTPUT" "success" "true" "T3.1: success=true"
test_json_field "$OUTPUT" "totalReplacements" "1" "T3.2: totalReplacements=1"
test_case "T3.3: Function name changed" "Medium: fetchData() returns value" "$(echo "$RESULT" | sed -n '2p')"

rm t3.txt
echo ""

# ============================================
# TEST 4: Complex Regex - Capture Group $1
# ============================================
echo "TEST 4: Complex Regex - Capture Group \$1"
echo "------------------------------------------"
cp test-verify.txt t4.txt
OUTPUT=$(npx tsx scripts/replace-string-in-file.ts --path t4.txt --regex --search 'foo\((\d+), "([^"]+)"\)' --replace 'foo($1, newArg)' 2>&1)
RESULT=$(cat t4.txt | sed -n '3p')

test_json_field "$OUTPUT" "success" "true" "T4.1: success=true"
test_json_field "$OUTPUT" "totalReplacements" "1" "T4.2: totalReplacements=1"

# Critical test: Verify capture group $1 (123) is preserved
if echo "$RESULT" | grep -q "foo(123, newArg)"; then
    test_case "T4.3: Capture group \$1 preserved" "PASS" "PASS"
else
    test_case "T4.3: Capture group \$1 preserved" "PASS" "FAIL - Got: $RESULT"
fi

rm t4.txt
echo ""

# ============================================
# TEST 5: Multiple Capture Groups
# ============================================
echo "TEST 5: Multiple Capture Groups (\$1 and \$2)"
echo "----------------------------------------------"
cp test-verify.txt t5.txt
OUTPUT=$(npx tsx scripts/replace-string-in-file.ts --path t5.txt --regex --search '([a-z]+)@([a-z]+)\.com' --replace '$1@$2.org' 2>&1)
RESULT=$(cat t5.txt | sed -n '4p')

test_json_field "$OUTPUT" "success" "true" "T5.1: success=true"
test_json_field "$OUTPUT" "totalReplacements" "1" "T5.2: totalReplacements=1"
test_case "T5.3: Both capture groups preserved" "Email: user@example.org" "$RESULT"

rm t5.txt
echo ""

# ============================================
# TEST 6: Dry-Run Mode (No Changes)
# ============================================
echo "TEST 6: Dry-Run Mode - No File Changes"
echo "---------------------------------------"
cp test-verify.txt t6.txt
BEFORE=$(cat t6.txt | head -1)
OUTPUT=$(npx tsx scripts/replace-string-in-file.ts --path t6.txt --search "hello" --replace "goodbye" --dry-run 2>&1)
AFTER=$(cat t6.txt | head -1)

test_json_field "$OUTPUT" "dryRun" "true" "T6.1: dryRun=true"
test_json_field "$OUTPUT" "totalReplacements" "1" "T6.2: Reports 1 replacement"
test_case "T6.3: File unchanged in dry-run" "$BEFORE" "$AFTER"

rm t6.txt
echo ""

# ============================================
# TEST 7: Backup Creation
# ============================================
echo "TEST 7: Backup File Creation"
echo "-----------------------------"
cp test-verify.txt t7.txt
OUTPUT=$(npx tsx scripts/replace-string-in-file.ts --path t7.txt --search "hello" --replace "goodbye" --backup 2>&1)

if [ -f "t7.txt.bak" ]; then
    BACKUP_CONTENT=$(cat t7.txt.bak | head -1)
    test_case "T7.1: Backup file created" "PASS" "PASS"
    test_case "T7.2: Backup has original content" "Simple: hello world" "$BACKUP_CONTENT"
    rm t7.txt.bak
else
    test_case "T7.1: Backup file created" "PASS" "FAIL - No backup file"
fi

rm t7.txt
echo ""

# ============================================
# TEST 8: Word Boundary Matching
# ============================================
echo "TEST 8: Word Boundary Matching"
echo "-------------------------------"
echo "test testing tested" > t8.txt
OUTPUT=$(npx tsx scripts/replace-string-in-file.ts --path t8.txt --search "test" --replace "exam" --word-match 2>&1)
RESULT=$(cat t8.txt)

test_json_field "$OUTPUT" "success" "true" "T8.1: success=true"
test_json_field "$OUTPUT" "totalReplacements" "1" "T8.2: Only 1 replacement (whole word)"
test_case "T8.3: Only whole word replaced" "exam testing tested" "$RESULT"

rm t8.txt
echo ""

# ============================================
# TEST 9: Multiple Files with Glob
# ============================================
echo "TEST 9: Multiple Files with Glob Pattern"
echo "-----------------------------------------"
echo "test content" > t9a.txt
echo "test content" > t9b.txt
echo "test content" > t9c.txt

OUTPUT=$(npx tsx scripts/replace-string-in-file.ts --path "t9*.txt" --search "test" --replace "exam" 2>&1)

test_json_field "$OUTPUT" "success" "true" "T9.1: success=true"
test_json_field "$OUTPUT" "totalFiles" "3" "T9.2: Processed 3 files"
test_json_field "$OUTPUT" "totalReplacements" "3" "T9.3: Made 3 replacements"

# Verify all files changed
ALL_CHANGED=true
for f in t9a.txt t9b.txt t9c.txt; do
    if ! grep -q "exam content" "$f"; then
        ALL_CHANGED=false
    fi
done

if [ "$ALL_CHANGED" = true ]; then
    test_case "T9.4: All files modified" "PASS" "PASS"
else
    test_case "T9.4: All files modified" "PASS" "FAIL"
fi

rm t9*.txt
echo ""

# ============================================
# TEST 10: Invalid Regex (Should Fail Gracefully)
# ============================================
echo "TEST 10: Invalid Regex - Should Fail Gracefully"
echo "------------------------------------------------"
cp test-verify.txt t10.txt
OUTPUT=$(npx tsx scripts/replace-string-in-file.ts --path t10.txt --regex --search '(unclosed' --replace 'something' 2>&1 || true)

if echo "$OUTPUT" | grep -q "Invalid regex pattern"; then
    test_case "T10.1: Reports invalid regex error" "PASS" "PASS"
else
    test_case "T10.1: Reports invalid regex error" "PASS" "FAIL"
fi

rm t10.txt
echo ""

# Cleanup
rm -f test-verify.txt

# ============================================
# FINAL RESULTS
# ============================================
echo "=========================================="
echo "FINAL RESULTS"
echo "=========================================="
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED - Tool is 100% accurate${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED - Tool has issues${NC}"
    echo ""
    exit 1
fi
