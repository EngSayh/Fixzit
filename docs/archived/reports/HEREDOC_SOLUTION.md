# Heredoc Solution - Complete Guide

## Status: ✅ RESOLVED

Both the `replace_string_in_file` tool and heredoc functionality are now working correctly.

---

## Problem Summary

1. **replace_string_in_file**: Tool was referenced but not implemented, causing "success but no changes" errors
2. **Heredoc**: PowerShell heredoc (here-strings) were misunderstood as "blocked"

---

## Solutions Implemented

### 1. replace_string_in_file Tool ✅

**Location**: `scripts/replace-string-in-file.ts`

**Features**:

- Literal and regex search
- Glob pattern support
- Word-boundary matching
- Backup creation
- Dry-run mode
- Detailed JSON reporting

**Usage**:

```bash
# Literal replacement
npm run replace:in-file -- --path "src/**/*.ts" --search "oldText" --replace "newText"

# Regex replacement
npm run replace:in-file -- --path "src/**/*.ts" --regex --search "old\\(\\)" --replace "new()"

# Dry-run first
npm run replace:in-file -- --path "*.md" --search "test" --replace "exam" --dry-run
```

**Documentation**: See `scripts/README-replace-string-in-file.md`

### 2. Heredoc (Here-Strings) ✅

**PowerShell Native Support**: PowerShell DOES support heredoc via "here-strings"

**Syntax**:

```powershell
# Literal (no variable expansion) - USE FOR CODE
$content = @'
Your content here
Special chars like $dollar and `backtick preserved
'@

# Expandable (with variables) - USE FOR TEXT
$name = "World"
$content = @"
Hello, $name!
Date: $(Get-Date)
"@

# Write to file
$content | Set-Content -Path "file.txt" -Encoding UTF8
```

**Helper Scripts**:

- `Write-HereDoc.ps1` - Simple file creation helper
- `PowerShell-Profile-Enhancement.ps1` - Profile functions

**Documentation**: See `POWERSHELL_HEREDOC_CONFIGURED.md`

---

## Three Methods for File Creation

### Method 1: PowerShell Here-Strings (Recommended)

```powershell
$route = @'
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({ status: "ok" });
}
'@

New-Item -Path "app/api/test" -ItemType Directory -Force | Out-Null
$route | Set-Content -Path "app/api/test/route.ts" -Encoding UTF8
```

**Pros**: Native, fast, no dependencies
**Cons**: Requires PowerShell syntax knowledge

### Method 2: Bash Heredoc

```bash
cat > app/api/test/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({ status: "ok" });
}
EOF
```

**Pros**: Familiar syntax, widely known
**Cons**: Requires bash available

### Method 3: Node.js Script

```javascript
const fs = require("fs");
const content = `
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({ status: "ok" });
}
`;
fs.writeFileSync("app/api/test/route.ts", content, "utf8");
```

**Pros**: Cross-platform, JavaScript native
**Cons**: Requires Node.js, more verbose

---

## Testing Results

### replace_string_in_file Tests

✅ **Test 1: Literal replacement**

```bash
echo "Hello World" > /tmp/test.txt
npm run replace:in-file -- --path "/tmp/test.txt" --search "World" --replace "Universe"
cat /tmp/test.txt
# Output: Hello Universe
```

✅ **Test 2: Dry-run mode**

```bash
npm run replace:in-file -- --path "package.json" --search "fixzit-frontend" --replace "fixzit-frontend" --dry-run
# Output: JSON with totalReplacements: 1, dryRun: true
```

✅ **Test 3: Glob patterns**

```bash
npm run replace:in-file -- --path "src/**/*.ts" --search "test" --replace "exam" --dry-run
# Output: Processes all matching TypeScript files
```

### Heredoc Tests

✅ **PowerShell Here-String**

```powershell
$test = @'
Line 1
Line 2
'@
$test | Set-Content -Path "test.txt"
# File created successfully
```

✅ **Bash Heredoc**

```bash
cat > test.txt << 'EOF'
Line 1
Line 2
EOF
# File created successfully
```

---

## Common Use Cases

### Use Case 1: Refactor Function Names

```bash
npm run replace:in-file -- \
  --path "src/**/*.ts" \
  --path "app/**/*.tsx" \
  --search "oldFunctionName" \
  --replace "newFunctionName" \
  --backup
```

### Use Case 2: Update Import Paths

```bash
npm run replace:in-file -- \
  --path "**/*.ts" \
  --regex \
  --search "from ['\"]@/old-path" \
  --replace "from '@/new-path"
```

### Use Case 3: Create Multiple API Routes

```powershell
$routes = @{
    "app/api/users/route.ts" = @'
export async function GET() {
  return Response.json({ users: [] });
}
'@
    "app/api/posts/route.ts" = @'
export async function GET() {
  return Response.json({ posts: [] });
}
'@
}

foreach ($path in $routes.Keys) {
    $dir = Split-Path -Path $path -Parent
    New-Item -Path $dir -ItemType Directory -Force | Out-Null
    $routes[$path] | Set-Content -Path $path -Encoding UTF8
    Write-Host "✅ Created: $path" -ForegroundColor Green
}
```

---

## Best Practices

### For replace_string_in_file

1. **Always dry-run first** for complex replacements
2. **Use --backup** for important files
3. **Test regex patterns** separately before applying
4. **Quote glob patterns** in shell commands
5. **Check git diff** after replacements

### For Heredoc/Here-Strings

1. **Use `@'...'@`** for code (preserves special chars)
2. **Use `@"..."@`** for text with variables
3. **Ensure closing delimiter** is on its own line
4. **No indentation** before closing delimiter
5. **Set UTF8 encoding** explicitly

---

## Troubleshooting

### replace_string_in_file Issues

**Problem**: No files matched

- **Solution**: Check glob pattern, use absolute paths if needed

**Problem**: No replacements made

- **Solution**: Verify search string case, use --dry-run to debug

**Problem**: Regex not working

- **Solution**: Escape special characters with `\\`, test pattern separately

### Heredoc Issues

**Problem**: PowerShell here-string not working

- **Solution**: Ensure `@'` and `'@` are on separate lines with no indentation

**Problem**: Variables not expanding

- **Solution**: Use `@"..."@` instead of `@'...'@` for variable expansion

**Problem**: Special characters causing issues

- **Solution**: Use literal here-string `@'...'@` for code with special chars

---

## Files Created/Modified

### New Files

- ✅ `scripts/replace-string-in-file.ts` - Main tool implementation
- ✅ `scripts/README-replace-string-in-file.md` - Tool documentation
- ✅ `HEREDOC_SOLUTION.md` - This document
- ✅ `Write-HereDoc.ps1` - PowerShell helper (already existed)
- ✅ `PowerShell-Profile-Enhancement.ps1` - Profile functions (already existed)
- ✅ `POWERSHELL_HEREDOC_CONFIGURED.md` - PowerShell guide (already existed)

### Modified Files

- ✅ `package.json` - Added `replace:in-file` script

---

## Conclusion

Both issues are now resolved:

1. **replace_string_in_file**: Fully functional CLI tool with comprehensive features
2. **Heredoc**: PowerShell here-strings work perfectly, multiple methods available

The system now has reliable tools for:

- ✅ String replacement across files
- ✅ File creation with multi-line content
- ✅ Regex-based transformations
- ✅ Safe operations with dry-run and backup

**All tools tested and verified working!** 🎉
