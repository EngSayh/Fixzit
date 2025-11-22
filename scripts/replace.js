#!/usr/bin/env node
/**
 * Simple wrapper for replace-string-in-file that handles escaping automatically
 * Usage: node scripts/replace.js <path> <search> <replace> [options]
 */

const { execSync } = require('child_process');
const path = require('path');

function showHelp() {
  console.log(`
Replace String in Files - Simple Interface

Usage:
  node scripts/replace.js <path> <search> <replace> [options]

Arguments:
  path      File path or glob pattern (required)
  search    String or regex to search for (required)
  replace   Replacement string (required)

Options:
  --regex         Treat search as regex pattern
  --word-match    Match whole words only (literal mode)
  --backup        Create .bak files before modifying
  --dry-run       Preview changes without modifying files
  --flags <f>     Regex flags (default: "g")

Examples:
  # Simple replacement
  node scripts/replace.js "src/**/*.ts" "oldFunc" "newFunc"

  # Regex with capture groups (NO SHELL ESCAPING NEEDED!)
  node scripts/replace.js "src/**/*.ts" "foo\\((\\d+)\\)" "bar($1)" --regex

  # Word boundary matching
  node scripts/replace.js "**/*.md" "test" "exam" --word-match

  # Dry run first
  node scripts/replace.js "config/*.json" "old" "new" --dry-run
`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  if (args.length < 3) {
    console.error('Error: Missing required arguments');
    showHelp();
    process.exit(1);
  }

  const [pathPattern, search, replace, ...options] = args;

  // Build the command with proper escaping
  const tsxPath = path.join(__dirname, 'replace-string-in-file.ts');
  
  // Use JSON.stringify to properly escape the arguments
  const cmd = [
    'npx',
    'tsx',
    JSON.stringify(tsxPath),
    '--path',
    JSON.stringify(pathPattern),
    '--search',
    JSON.stringify(search),
    '--replace',
    JSON.stringify(replace),
    ...options
  ].join(' ');

  try {
    execSync(cmd, { stdio: 'inherit', shell: true });
  } catch (err) {
    process.exit(err.status || 1);
  }
}

main();
