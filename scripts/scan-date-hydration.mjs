#!/usr/bin/env node
/**
 * Date Hydration Scanner
 * Identifies all patterns that cause SSR/client hydration mismatches
 * 
 * Usage: node scripts/scan-date-hydration.mjs
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const PATTERNS = [
  { name: 'new Date() in JSX', regex: /\{[^}]*new Date\([^)]*\)[^}]*\}/g },
  { name: 'Date.now() in JSX', regex: /\{[^}]*Date\.now\([^)]*\)[^}]*\}/g },
  { name: '.toLocaleDateString()', regex: /\.toLocaleDateString\(/g },
  { name: '.toLocaleTimeString()', regex: /\.toLocaleTimeString\(/g },
  { name: '.toLocaleString()', regex: /\.toLocaleString\(/g },
  { name: '.toISOString() in JSX', regex: /\{[^}]*\.toISOString\([^)]*\)[^}]*\}/g }
];

const EXCLUDE_DIRS = ['node_modules', '.next', 'dist', 'coverage', '_artifacts', 'test-results', 'playwright-report'];
const INCLUDE_EXTS = ['.tsx', '.ts'];

function scanFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const issues = [];
    
    for (const pattern of PATTERNS) {
      const matches = [...content.matchAll(pattern.regex)];
      if (matches.length > 0) {
        matches.forEach(match => {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          issues.push({
            line: lineNumber,
            pattern: pattern.name,
            code: match[0].substring(0, 80) // First 80 chars
          });
        });
      }
    }
    
    return issues;
  } catch (error) {
    return [];
  }
}

function scanDirectory(dir, results = []) {
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!EXCLUDE_DIRS.some(ex => fullPath.includes(ex))) {
          scanDirectory(fullPath, results);
        }
      } else if (INCLUDE_EXTS.some(ext => entry.endsWith(ext))) {
        const issues = scanFile(fullPath);
        if (issues.length > 0) {
          results.push({ file: fullPath, issues });
        }
      }
    }
  } catch (error) {
    // Skip inaccessible directories
  }
  
  return results;
}

// Main execution
const targetDirs = ['app', 'components', 'lib'];
const allResults = [];

for (const dir of targetDirs) {
  console.error(`Scanning ${dir}/...`);
  const results = scanDirectory(dir);
  allResults.push(...results);
}

// Output summary
console.log('\n=== Date Hydration Issues Summary ===\n');
console.log(`Total files with issues: ${allResults.length}`);
console.log(`Total issues: ${allResults.reduce((sum, r) => sum + r.issues.length, 0)}\n`);

// Group by pattern
const byPattern = {};
allResults.forEach(result => {
  result.issues.forEach(issue => {
    if (!byPattern[issue.pattern]) byPattern[issue.pattern] = [];
    byPattern[issue.pattern].push({ file: result.file, line: issue.line });
  });
});

console.log('=== By Pattern ===\n');
for (const [pattern, instances] of Object.entries(byPattern)) {
  console.log(`${pattern}: ${instances.length} instances`);
}

// Output detailed list
console.log('\n=== Detailed List ===\n');
allResults.forEach(result => {
  console.log(`\nFile: ${result.file}`);
  result.issues.forEach(issue => {
    console.log(`  Line ${issue.line}: ${issue.pattern}`);
    console.log(`    ${issue.code}`);
  });
});

// Output JSON for automation
console.log('\n=== JSON Output ===');
console.log(JSON.stringify(allResults, null, 2));

process.exit(0);
