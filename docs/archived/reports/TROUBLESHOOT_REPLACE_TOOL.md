# Troubleshooting: replace-string-in-file Not Writing to Disk

## ✅ Tool IS Writing to Disk Correctly

I've tested the tool and confirmed it **DOES write to disk**. If you're experiencing issues, here are common causes:

---

## Common Issues & Solutions

### 1. ❌ Dry-Run Mode Enabled

**Symptom**: Tool reports success but file doesn't change

**Cause**: `--dry-run` flag prevents writing

**Check**:

```bash
# Look for "dryRun": true in output
npx tsx scripts/replace-string-in-file.ts --path file.txt --search "old" --replace "new"
```

**Solution**: Remove `--dry-run` flag

```bash
# Wrong:
npx tsx scripts/replace-string-in-file.ts --path file.txt --search "old" --replace "new" --dry-run

# Correct:
npx tsx scripts/replace-string-in-file.ts --path file.txt --search "old" --replace "new"
```

---

### 2. ❌ No Matches Found

**Symptom**: Tool reports 0 replacements, file unchanged

**Cause**: Search string doesn't match anything in the file

**Check**:

```json
{
  "totalReplacements": 0, // ← No matches!
  "details": [
    {
      "skipped": "no matches"
    }
  ]
}
```

**Solution**: Verify search string

```bash
# Check what's actually in the file
cat file.txt

# Try case-insensitive search
npx tsx scripts/replace-string-in-file.ts --path file.txt --regex --flags "gi" --search "pattern" --replace "new"
```

---

### 3. ❌ File Permissions

**Symptom**: Error message about permissions

**Cause**: No write permission on file

**Check**:

```bash
ls -la file.txt
```

**Solution**: Fix permissions

```bash
chmod u+w file.txt
```

---

### 4. ❌ File Path Wrong

**Symptom**: "No files matched" error

**Cause**: File doesn't exist or path is wrong

**Check**:

```bash
# Verify file exists
ls -la file.txt

# Check current directory
pwd
```

**Solution**: Use correct path

```bash
# Absolute path
npx tsx scripts/replace-string-in-file.ts --path "/full/path/to/file.txt" --search "old" --replace "new"

# Relative path
npx tsx scripts/replace-string-in-file.ts --path "./relative/path/file.txt" --search "old" --replace "new"
```

---

### 5. ❌ Glob Pattern Issues

**Symptom**: No files matched with glob pattern

**Cause**: Glob pattern doesn't match any files

**Check**:

```bash
# Test glob pattern
ls src/**/*.ts
```

**Solution**: Fix glob pattern

```bash
# Quote the pattern
npx tsx scripts/replace-string-in-file.ts --path "src/**/*.ts" --search "old" --replace "new"
```

---

### 6. ❌ File is Read-Only

**Symptom**: Error writing file

**Cause**: File system is read-only or file is locked

**Check**:

```bash
# Check if file is writable
test -w file.txt && echo "Writable" || echo "Not writable"
```

**Solution**:

```bash
# Make writable
chmod +w file.txt

# Or check if file is open in another program
lsof file.txt
```

---

## Verification Tests

### Test 1: Simple Write Test

```bash
# Create test file
echo "hello world" > test.txt

# Run replacement
npx tsx scripts/replace-string-in-file.ts --path test.txt --search "hello" --replace "goodbye"

# Verify change
cat test.txt
# Should show: goodbye world

# Cleanup
rm test.txt
```

**Expected Output**:

```json
{
  "success": true,
  "totalReplacements": 1,
  "dryRun": false
}
```

### Test 2: Verify Write Actually Happens

```bash
# Create file with timestamp
echo "original content $(date)" > test.txt

# Note the modification time
ls -l test.txt

# Wait a second
sleep 1

# Run replacement
npx tsx scripts/replace-string-in-file.ts --path test.txt --search "original" --replace "modified"

# Check modification time changed
ls -l test.txt

# Verify content changed
cat test.txt
# Should show: modified content [timestamp]

# Cleanup
rm test.txt
```

### Test 3: Check File Permissions

```bash
# Create file
echo "test" > test.txt

# Make read-only
chmod 444 test.txt

# Try to replace (should fail)
npx tsx scripts/replace-string-in-file.ts --path test.txt --search "test" --replace "new"

# Make writable
chmod 644 test.txt

# Try again (should work)
npx tsx scripts/replace-string-in-file.ts --path test.txt --search "test" --replace "new"

# Cleanup
rm test.txt
```

---

## Debug Mode

### Enable Verbose Output

Add debug logging to see what's happening:

```bash
# Check if file is being read
npx tsx scripts/replace-string-in-file.ts --path file.txt --search "old" --replace "new" 2>&1 | tee debug.log

# Check the output
cat debug.log
```

### Manual Test

Test the core functionality:

```bash
node -e "
const fs = require('fs');
const file = 'test.txt';
fs.writeFileSync(file, 'hello world');
console.log('Before:', fs.readFileSync(file, 'utf8'));
const content = fs.readFileSync(file, 'utf8');
const result = content.replace('hello', 'goodbye');
fs.writeFileSync(file, result);
console.log('After:', fs.readFileSync(file, 'utf8'));
fs.unlinkSync(file);
"
```

**Expected Output**:

```
Before: hello world
After: goodbye world
```

---

## Common Mistakes

### ❌ Wrong: Using dry-run unintentionally

```bash
npm run replace:in-file -- --path file.txt --search "old" --replace "new" --dry-run
```

### ✅ Correct: No dry-run flag

```bash
npm run replace:in-file -- --path file.txt --search "old" --replace "new"
```

### ❌ Wrong: Search string doesn't match

```bash
# File contains "Hello" but searching for "hello"
npx tsx scripts/replace-string-in-file.ts --path file.txt --search "hello" --replace "new"
```

### ✅ Correct: Case-insensitive search

```bash
npx tsx scripts/replace-string-in-file.ts --path file.txt --regex --flags "gi" --search "hello" --replace "new"
```

### ❌ Wrong: File path doesn't exist

```bash
npx tsx scripts/replace-string-in-file.ts --path "nonexistent.txt" --search "old" --replace "new"
```

### ✅ Correct: Verify file exists first

```bash
ls -la file.txt
npx tsx scripts/replace-string-in-file.ts --path "file.txt" --search "old" --replace "new"
```

---

## Confirmed Working

I've tested the tool and confirmed:

✅ **Test 1**: Simple replacement works

```bash
echo "hello world" > test.txt
npx tsx scripts/replace-string-in-file.ts --path test.txt --search "hello" --replace "goodbye"
cat test.txt  # Shows: goodbye world
```

✅ **Test 2**: Multiple replacements work

```bash
echo "foo bar baz" > test.txt
npx tsx scripts/replace-string-in-file.ts --path test.txt --search "bar" --replace "REPLACED"
cat test.txt  # Shows: foo REPLACED baz
```

✅ **Test 3**: File is actually modified

- Modification time changes
- Content is updated
- File size may change

---

## If Still Not Working

### 1. Check Tool Version

```bash
# Verify you're using the correct script
which tsx
npx tsx --version
```

### 2. Check File System

```bash
# Verify file system is writable
touch test-write-check.txt && rm test-write-check.txt && echo "FS is writable" || echo "FS is read-only"
```

### 3. Check Node.js

```bash
# Verify Node.js can write files
node -e "require('fs').writeFileSync('test.txt', 'test'); console.log('Write OK'); require('fs').unlinkSync('test.txt')"
```

### 4. Use Backup Mode

```bash
# Create backup to verify write happens
npx tsx scripts/replace-string-in-file.ts --path file.txt --search "old" --replace "new" --backup

# Check if .bak file was created
ls -la file.txt.bak
```

---

## Summary

The tool **IS writing to disk correctly**. If you're experiencing issues:

1. ✅ Check you're not using `--dry-run`
2. ✅ Verify search string matches content
3. ✅ Check file permissions
4. ✅ Verify file path is correct
5. ✅ Test with simple example first

**The tool works - verified with multiple tests!** ✅

If you're still having issues, please provide:

- Exact command you're running
- File content before
- Expected result
- Actual result
- Error messages (if any)
