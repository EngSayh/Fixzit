#!/usr/bin/env node
// Flags hardcoded db.collection("...") usages that are not using COLLECTIONS.
// Usage: node scripts/lint-collections.js [path...]

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const args = process.argv.slice(2);
// By default, scan runtime and scripts (app/server/lib/modules/scripts).
// Pass additional paths explicitly if needed.
const roots = args.length ? args : ['app', 'server', 'lib', 'modules', 'scripts'];

const allowExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
const allowLiterals = new Set([
  // explicit allowlist for non-mongo or test fixtures
  'memory',
  '_deployment_test',
  '_tenant_test',
  '_perf_test',
  'test', // generic test DB in scripts
  'system.version', // Mongo internal collection used for health checks
]);

let violations = [];

for (const root of roots) {
  const pattern = path.join(root, '**/*.{ts,tsx,js,mjs,cjs}');
    const files = glob.sync(pattern, { nodir: true, ignore: ['**/node_modules/**', '**/coverage/**', '**/dist/**', '**/.next/**'] });
  for (const file of files) {
    if (file.endsWith('scripts/lint-collections.js')) continue; // skip self
    const ext = path.extname(file);
    if (!allowExtensions.has(ext)) continue;
    const content = fs.readFileSync(file, 'utf8');

    // Rough scan: match .collection("...") where ... is a string literal
    const regex = /\.collection\((['"])([^'"`]+)\1\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const literal = match[2];
      // Skip if looks like COLLECTIONS.* or template expressions
      if (/COLLECTIONS\./.test(literal)) continue;
      if (allowLiterals.has(literal)) continue;
      // Skip allowlisted test-only patterns
      if (/__mocks__/.test(file) || /tests\//.test(file)) continue;

      const line = content.slice(0, match.index).split('\n').length;
      violations.push({ file, line, literal });
    }
  }
}

if (violations.length) {
  console.error('Hardcoded collection literals found (use COLLECTIONS.*):');
  for (const v of violations) {
    console.error(` - ${v.file}:${v.line} -> "${v.literal}"`);
  }
  process.exit(1);
} else {
  console.log('✅ No hardcoded collection literals found');
}
