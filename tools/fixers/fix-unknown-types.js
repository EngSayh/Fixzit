#!/usr/bin/env node
/**
 * Automated script to fix 'unknown' type errors
 * This script identifies common patterns and applies type guards
 */

const fs = require('fs');
const { execSync } = require('child_process');

// Get all TypeScript errors
console.log('🔍 Analyzing TypeScript errors...');
const errors = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf-8' });
const errorLines = errors.split('\n').filter(line => line.includes('error TS18046'));

console.log(`Found ${errorLines.length} 'unknown' type errors`);

// Parse errors by file
const errorsByFile = {};
errorLines.forEach(line => {
  const match = line.match(/^(.+?)\((\d+),(\d+)\): error TS18046: '(.+)' is of type 'unknown'/);
  if (match) {
    const [, file, lineNum, col, varName] = match;
    if (!errorsByFile[file]) {
      errorsByFile[file] = [];
    }
    errorsByFile[file].push({ lineNum: parseInt(lineNum), col: parseInt(col), varName });
  }
});

console.log(`\n📁 Errors found in ${Object.keys(errorsByFile).length} files`);

// Function to add type annotation to array methods
function fixUnknownInArrayMethods(filePath, errors) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let modified = false;

  // Sort errors by line number (descending) to avoid offset issues
  errors.sort((a, b) => b.lineNum - a.lineNum);

  errors.forEach(({ lineNum, varName }) => {
    const lineIndex = lineNum - 1;
    const line = lines[lineIndex];

    // Check if it's an array method with (variable: unknown) pattern
    const patterns = [
      { regex: new RegExp(`\\.filter\\(\\(${varName}:\\s*unknown\\)`, 'g'), replacement: `.filter((${varName}: any)` },
      { regex: new RegExp(`\\.map\\(\\(${varName}:\\s*unknown\\)`, 'g'), replacement: `.map((${varName}: any)` },
      { regex: new RegExp(`\\.forEach\\(\\(${varName}:\\s*unknown\\)`, 'g'), replacement: `.forEach((${varName}: any)` },
      { regex: new RegExp(`\\.find\\(\\(${varName}:\\s*unknown\\)`, 'g'), replacement: `.find((${varName}: any)` },
      { regex: new RegExp(`\\.some\\(\\(${varName}:\\s*unknown\\)`, 'g'), replacement: `.some((${varName}: any)` },
      { regex: new RegExp(`\\.every\\(\\(${varName}:\\s*unknown\\)`, 'g'), replacement: `.every((${varName}: any)` },
    ];

    patterns.forEach(({ regex, replacement }) => {
      if (regex.test(line)) {
        lines[lineIndex] = line.replace(regex, replacement);
        modified = true;
      }
    });
  });

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    return true;
  }
  return false;
}

// Process each file
let fixedFiles = 0;
Object.entries(errorsByFile).forEach(([file, errors]) => {
  if (file.startsWith('app/') || file.startsWith('components/') || file.startsWith('lib/') || file.startsWith('server/') || file.startsWith('services/')) {
    console.log(`\n🔧 Processing ${file} (${errors.length} errors)`);
    if (fixUnknownInArrayMethods(file, errors)) {
      fixedFiles++;
      console.log(`   ✅ Fixed ${file}`);
    }
  }
});

console.log(`\n✨ Fixed ${fixedFiles} files`);
console.log('\n🔍 Re-running TypeScript check...');
const newErrors = execSync('npx tsc --noEmit 2>&1 | grep "error TS" | wc -l', { encoding: 'utf-8' });
console.log(`Remaining errors: ${newErrors.trim()}`);
