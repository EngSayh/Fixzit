# replace-string-in-file Tool

## Overview

A reliable, cross-platform CLI tool for replacing strings in files with support for:

- Literal or regex search patterns
- Glob patterns for file selection
- Word-boundary matching
- Backup creation
- Dry-run mode
- Detailed reporting

## Installation

Already installed! Available via npm script:

```bash
npm run replace:in-file -- [options]
```

## Basic Usage

### Literal String Replacement

```bash
# Replace all occurrences of "oldText" with "newText" in a single file
npm run replace:in-file -- --path "README.md" --search "oldText" --replace "newText"

# Replace across multiple files using glob
npm run replace:in-file -- --path "src/**/*.ts" --search "oldFunction()" --replace "newFunction()"
```

### Regex Replacement

```bash
# Use regex with capture groups
npm run replace:in-file -- \
  --path "src/**/*.ts" \
  --regex \
  --flags "gi" \
  --search "console\\.log\\((.+)\\)" \
  --replace "logger.info($1)"
```

### Word-Boundary Matching

```bash
# Only replace whole words (prevents "test" from matching "testing")
npm run replace:in-file -- \
  --path "**/*.md" \
  --search "test" \
  --replace "exam" \
  --word-match
```

### Dry-Run Mode

```bash
# Preview changes without modifying files
npm run replace:in-file -- \
  --path "src/**/*.ts" \
  --search "old" \
  --replace "new" \
  --dry-run
```

### Backup Files

```bash
# Create .bak files before modifying
npm run replace:in-file -- \
  --path "config/*.json" \
  --search "localhost" \
  --replace "production.com" \
  --backup
```

## Options

| Option         | Description                            | Required | Default |
| -------------- | -------------------------------------- | -------- | ------- |
| `--path`       | File path or glob pattern (repeatable) | Yes      | -       |
| `--search`     | String or regex pattern to search for  | Yes      | -       |
| `--replace`    | Replacement string                     | Yes      | -       |
| `--regex`      | Treat search as regex                  | No       | false   |
| `--flags`      | Regex flags (e.g., "gi")               | No       | "g"     |
| `--word-match` | Match whole words only (literal mode)  | No       | false   |
| `--encoding`   | File encoding                          | No       | utf8    |
| `--backup`     | Create .bak files                      | No       | false   |
| `--dry-run`    | Preview without changes                | No       | false   |

## Examples

### Example 1: Update Import Paths

```bash
npm run replace:in-file -- \
  --path "src/**/*.ts" \
  --search "@/old-lib" \
  --replace "@/new-lib"
```

### Example 2: Fix Function Calls with Regex

```bash
npm run replace:in-file -- \
  --path "app/**/*.tsx" \
  --regex \
  --search "getData\\(\\)" \
  --replace "await getData()"
```

### Example 3: Multiple Paths

```bash
npm run replace:in-file -- \
  --path "src/**/*.ts" \
  --path "app/**/*.tsx" \
  --path "lib/**/*.ts" \
  --search "oldValue" \
  --replace "newValue"
```

### Example 4: Safe Replacement with Backup and Dry-Run

```bash
# Step 1: Preview changes
npm run replace:in-file -- \
  --path "config/**/*.json" \
  --search "\"port\": 3000" \
  --replace "\"port\": 8080" \
  --dry-run

# Step 2: Apply with backup
npm run replace:in-file -- \
  --path "config/**/*.json" \
  --search "\"port\": 3000" \
  --replace "\"port\": 8080" \
  --backup
```

## Output Format

The tool outputs JSON with detailed results:

```json
{
  "success": true,
  "message": "Completed with 5 replacement(s) across 3 file(s).",
  "totalFiles": 3,
  "totalReplacements": 5,
  "dryRun": false,
  "backup": false,
  "regex": false,
  "wordMatch": false,
  "details": [
    {
      "file": "src/utils.ts",
      "matched": true,
      "replaced": 2
    },
    {
      "file": "src/helpers.ts",
      "matched": true,
      "replaced": 3
    },
    {
      "file": "src/config.ts",
      "matched": true,
      "replaced": 0,
      "skipped": "no matches"
    }
  ]
}
```

## Regex Tips

### Escaping Special Characters

In regex mode, escape these characters: `. * + ? ^ $ { } ( ) | [ ] \`

```bash
# Match "getData()" literally
--search "getData\\(\\)"

# Match any number
--search "\\d+"

# Match word boundary
--search "\\btest\\b"
```

### Capture Groups

Use `$1`, `$2`, etc. in replacement string:

```bash
# Swap function arguments
--regex --search "func\\((.+), (.+)\\)" --replace "func($2, $1)"
```

### Common Patterns

```bash
# Remove console.log statements
--regex --search "console\\.log\\([^)]*\\);?\\n?" --replace ""

# Update version numbers
--regex --search "version: ['\"]\\d+\\.\\d+\\.\\d+['\"]" --replace "version: '2.0.0'"

# Convert single to double quotes
--regex --search "'([^']*)'" --replace "\"$1\""
```

## Troubleshooting

### No Files Matched

- Check glob pattern syntax
- Ensure paths are relative to current directory
- Use absolute paths if needed

### No Replacements Made

- Verify search string matches exactly (case-sensitive by default)
- Use `--dry-run` to see what would be matched
- Check file encoding matches `--encoding` option

### Regex Not Working

- Escape special regex characters with `\\`
- Test regex pattern separately first
- Use online regex testers for complex patterns

## Integration with Git

```bash
# Preview changes
npm run replace:in-file -- --path "src/**/*.ts" --search "old" --replace "new" --dry-run

# Apply changes
npm run replace:in-file -- --path "src/**/*.ts" --search "old" --replace "new"

# Review changes
git diff

# Commit if satisfied
git add -A
git commit -m "refactor: replace old with new"
```

## Performance

- Processes files sequentially
- Reads entire file into memory
- Suitable for typical source code files
- For very large files (>100MB), consider streaming alternatives

## Limitations

- Binary files are not supported
- Very large files may cause memory issues
- Glob patterns must be quoted in shell
- Regex capture groups limited by JavaScript RegExp

## See Also

- [fast-glob documentation](https://github.com/mrmlnc/fast-glob)
- [JavaScript RegExp reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions)
- [Node.js fs documentation](https://nodejs.org/api/fs.html)
