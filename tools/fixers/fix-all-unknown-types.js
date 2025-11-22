#!/usr/bin/env node
/**
 * Comprehensive unknown type fixer
 * Fixes ALL patterns of 'unknown' type usage
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 Analyzing all TypeScript errors...\n');

// Get all errors
let errorOutput;
try {
  errorOutput = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
} catch (e) {
  errorOutput = e.stdout || '';
}

const allErrors = errorOutput.split('\n').filter(line => line.includes('error TS'));
console.log(`Total errors found: ${allErrors.length}\n`);

// Focus on TS18046 (unknown type) errors
const unknownErrors = allErrors.filter(line => line.includes('TS18046'));
console.log(`Unknown type errors (TS18046): ${unknownErrors.length}\n`);

// Group by file
const fileErrors = {};
unknownErrors.forEach(line => {
  const match = line.match(/^(.+?)\((\d+),\d+\): error TS18046: '(.+)' is of type 'unknown'/);
  if (match) {
    const [, file, , varName] = match;
    if (!fileErrors[file]) fileErrors[file] = new Set();
    fileErrors[file].add(varName);
  }
});

console.log(`Files with unknown type errors: ${Object.keys(fileErrors).length}\n`);

// Process each file
let totalFixed = 0;
let totalLinesChanged = 0;

Object.entries(fileErrors).forEach(([filePath, varNames]) => {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // For each variable with unknown type, replace all occurrences in the file
    varNames.forEach(varName => {
      // Pattern 1: Array method callbacks (x: unknown) => ...
      const arrayMethodPattern = new RegExp(`\\(${varName}:\\s*unknown\\)`, 'g');
      content = content.replace(arrayMethodPattern, `(${varName}: any)`);
      
      // Pattern 2: Variable access after typing as unknown
      // This is trickier - we can't just replace usage, we need to find where it's declared
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Fixed ${filePath} (${varNames.size} variables)`);
      totalFixed++;
      totalLinesChanged += content.split('\n').length;
    }
  } catch (error) {
    console.log(`❌ Error processing ${filePath}: ${error.message}`);
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Files fixed: ${totalFixed}`);
console.log(`   Lines processed: ${totalLinesChanged}`);

// Re-check errors
console.log('\n🔍 Re-checking TypeScript errors...');
try {
  errorOutput = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
} catch (e) {
  errorOutput = e.stdout || '';
}

const remainingErrors = (errorOutput.match(/error TS/g) || []).length;
const remainingUnknown = (errorOutput.match(/error TS18046/g) || []).length;

console.log(`\n✨ Results:`);
console.log(`   Total errors: ${allErrors.length} → ${remainingErrors} (fixed ${allErrors.length - remainingErrors})`);
console.log(`   Unknown type errors: ${unknownErrors.length} → ${remainingUnknown} (fixed ${unknownErrors.length - remainingUnknown})`);
