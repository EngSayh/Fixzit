#!/usr/bin/env node
/**
 * Guards critical i18n components against LTR-only Tailwind utilities.
 * Scans TopBar + selector surfaces for classes like text-left, ml-*, etc.
 */
const { execSync } = require('node:child_process');
const { readFileSync } = require('node:fs');

const PATTERNS = [
  'components/topbar/*.ts',
  'components/topbar/*.tsx',
  'components/topbar/**/*.ts',
  'components/topbar/**/*.tsx',
  'components/i18n/*.ts',
  'components/i18n/*.tsx',
  'components/i18n/**/*.ts',
  'components/i18n/**/*.tsx',
  'components/TopBar.tsx',
  'app/hr/**/*.ts',
  'app/hr/**/*.tsx',
  'app/fm/**/*.ts',
  'app/fm/**/*.tsx',
  'app/dashboard/hr/**/*.ts',
  'app/dashboard/hr/**/*.tsx',
  'app/dashboard/**/*.ts',
  'app/dashboard/**/*.tsx',
  'components/admin/**/*.ts',
  'components/admin/**/*.tsx',
  'app/_shell/**/*.ts',
  'app/_shell/**/*.tsx',
  'app/layout.tsx',
  'app/marketplace/**/*.ts',
  'app/marketplace/**/*.tsx',
  'app/souq/**/*.ts',
  'app/souq/**/*.tsx',
  'components/seller/**/*.ts',
  'components/seller/**/*.tsx',
  'components/souq/**/*.ts',
  'components/souq/**/*.tsx',
];

const BANNED_RULES = [
  { regex: /\btext-left\b/, message: 'Use text-start/text-end instead of text-left.' },
  { regex: /\btext-right\b/, message: 'Use text-start/text-end instead of text-right (or text-end for numbers).' },
  { regex: /\bml-(?:\d+|auto)\b/, message: 'Use ms-* logical margin utilities instead of ml-*.' },
  { regex: /\bmr-(?:\d+|auto)\b/, message: 'Use me-* logical margin utilities instead of mr-*.' },
  { regex: /\bpl-(?:\d+|auto)\b/, message: 'Use ps-* logical padding utilities instead of pl-*.' },
  { regex: /\bpr-(?:\d+|auto)\b/, message: 'Use pe-* logical padding utilities instead of pr-*.' },
  { regex: /\bleft-\d+/, message: 'Use start-* utilities instead of left-*.' },
  { regex: /\bright-\d+/, message: 'Use end-* utilities instead of right-*.' },
];

function listFiles(patterns) {
  const args = patterns.map((p) => `'${p}'`).join(' ');
  const output = execSync(`git ls-files ${args}`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

const files = listFiles(PATTERNS);
if (files.length === 0) {
  process.exit(0);
}

const violations = [];
for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    BANNED_RULES.forEach((rule) => {
      if (rule.regex.test(line)) {
        violations.push({
          file,
          line: idx + 1,
          message: rule.message,
          snippet: line.trim(),
        });
      }
    });
  });
}

if (violations.length) {
  console.error('❌ RTL logical lint failed. Replace the flagged utilities:');
  for (const violation of violations) {
    console.error(`  - ${violation.file}:${violation.line} → ${violation.message}`);
    console.error(`      ${violation.snippet}`);
  }
  process.exit(1);
}

console.log('✅ RTL logical lint passed — no LTR-only utilities found in critical components.');
