#!/usr/bin/env node
/**
 * Fix misplaced imports in test files
 * Moves imports that are between /** and the rest of JSDoc comment
 */

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const testFiles = globSync('tests/api/**/*.test.ts');
let fixedCount = 0;
let errorCount = 0;

for (const file of testFiles) {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    // Check if line 1 is /** and line 2 is an import
    if (lines[0] === '/**' && lines[1] && lines[1].startsWith('import {')) {
      // Find where the JSDoc comment ends
      let jsdocEnd = -1;
      for (let i = 2; i < lines.length; i++) {
        if (lines[i].includes('*/')) {
          jsdocEnd = i;
          break;
        }
      }
      
      if (jsdocEnd === -1) {
        console.log(`SKIP: ${file} - cannot find JSDoc end`);
        continue;
      }
      
      // Extract the misplaced import
      const misplacedImport = lines[1];
      
      // Find where other imports start (after JSDoc)
      let firstImportLine = jsdocEnd + 1;
      
      // Reconstruct the file:
      // 1. JSDoc without misplaced import
      // 2. Existing imports (after JSDoc)
      // 3. Add misplaced import at proper location
      
      const newLines = [
        lines[0], // /**
        ...lines.slice(2, jsdocEnd + 1), // rest of JSDoc (skip misplaced import)
        misplacedImport, // moved import
        ...lines.slice(jsdocEnd + 1) // rest of file
      ];
      
      fs.writeFileSync(file, newLines.join('\n'));
      console.log(`FIXED: ${file}`);
      fixedCount++;
    }
  } catch (err) {
    console.error(`ERROR: ${file} - ${err.message}`);
    errorCount++;
  }
}

console.log(`\nSummary: Fixed ${fixedCount} files, ${errorCount} errors`);
