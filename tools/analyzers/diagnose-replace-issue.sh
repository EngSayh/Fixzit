#!/bin/bash
# Diagnostic script for replace-string-in-file issues
# Run this on the system where the tool is failing

echo "=========================================="
echo "DIAGNOSTIC: replace-string-in-file"
echo "=========================================="
echo ""

# Environment info
echo "1. ENVIRONMENT INFO"
echo "-------------------"
echo "OS: $(uname -a)"
echo "Shell: $SHELL"
echo "PWD: $(pwd)"
echo "User: $(whoami)"
echo "Node version: $(node --version 2>&1)"
echo "NPM version: $(npm --version 2>&1)"
echo ""

# File system info
echo "2. FILE SYSTEM INFO"
echo "-------------------"
echo "Mount point: $(df -h . | tail -1)"
echo "File system type: $(df -T . 2>/dev/null | tail -1 | awk '{print $2}' || echo 'unknown')"
echo "Available space: $(df -h . | tail -1 | awk '{print $4}')"
echo ""

# Test file creation
echo "3. FILE CREATION TEST"
echo "---------------------"
TEST_FILE="diagnostic-test-$(date +%s).txt"
echo "Creating test file: $TEST_FILE"

if echo "test content" > "$TEST_FILE"; then
    echo "✅ Can create files"
    echo "File content: $(cat $TEST_FILE)"
    
    # Test modification
    if echo "modified content" > "$TEST_FILE"; then
        echo "✅ Can modify files"
    else
        echo "❌ Cannot modify files"
    fi
    
    # Test Node.js write
    if node -e "require('fs').writeFileSync('$TEST_FILE', 'node write')"; then
        echo "✅ Node.js can write files"
        echo "Content after Node write: $(cat $TEST_FILE)"
    else
        echo "❌ Node.js cannot write files"
    fi
else
    echo "❌ Cannot create files"
fi
echo ""

# Test the actual tool
echo "4. TOOL TEST"
echo "------------"
echo "test original content" > "$TEST_FILE"
echo "Before: $(cat $TEST_FILE)"

# Capture full output
echo "Running tool..."
OUTPUT=$(npx tsx scripts/replace-string-in-file.ts \
  --path "$TEST_FILE" \
  --search "original" \
  --replace "REPLACED" 2>&1)

echo "$OUTPUT"
echo ""
echo "After: $(cat $TEST_FILE)"

# Check if it worked
if grep -q "REPLACED" "$TEST_FILE"; then
    echo "✅ Tool successfully modified file"
else
    echo "❌ Tool DID NOT modify file"
    echo ""
    echo "DEBUGGING INFO:"
    echo "- File exists: $(test -f $TEST_FILE && echo 'yes' || echo 'no')"
    echo "- File readable: $(test -r $TEST_FILE && echo 'yes' || echo 'no')"
    echo "- File writable: $(test -w $TEST_FILE && echo 'yes' || echo 'no')"
    echo "- File size: $(wc -c < $TEST_FILE) bytes"
    echo "- File inode: $(ls -i $TEST_FILE | awk '{print $1}')"
    echo ""
    echo "Trying sed for comparison:"
    sed -i 's/test/SED_WORKED/g' "$TEST_FILE"
    echo "After sed: $(cat $TEST_FILE)"
fi
echo ""

# Check for common issues
echo "5. COMMON ISSUES CHECK"
echo "----------------------"

# Check if tsx is working
if command -v tsx &> /dev/null; then
    echo "✅ tsx is available"
    echo "   Location: $(which tsx)"
else
    echo "❌ tsx is NOT available"
fi

# Check if file system is read-only
if touch test-write-check-$$.tmp 2>/dev/null; then
    rm test-write-check-$$.tmp
    echo "✅ File system is writable"
else
    echo "❌ File system is READ-ONLY"
fi

# Check for SELinux/AppArmor
if command -v getenforce &> /dev/null; then
    echo "SELinux status: $(getenforce 2>&1)"
fi

if command -v aa-status &> /dev/null; then
    echo "AppArmor status: $(aa-status 2>&1 | head -1)"
fi

# Check for file system sync issues
echo ""
echo "6. FILE SYSTEM SYNC TEST"
echo "------------------------"
echo "test sync" > "$TEST_FILE"
sync
echo "After sync: $(cat $TEST_FILE)"
echo ""

# Cleanup
rm -f "$TEST_FILE"

echo "=========================================="
echo "DIAGNOSTIC COMPLETE"
echo "=========================================="
echo ""
echo "If tool is failing:"
echo "1. Check if 'dryRun' is true in output"
echo "2. Verify file permissions"
echo "3. Check if file system is read-only"
echo "4. Try running with sudo (if appropriate)"
echo "5. Check if antivirus is blocking writes"
