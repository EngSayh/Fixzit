#!/usr/bin/env node
/**
 * Fix misplaced imports in test files
 * Moves imports that are between /** and the rest of JSDoc comment
 */

const fs = require('fs');
const { globSync } = require('glob');

const testFiles = globSync('tests/api/**/*.test.ts');
let fixedCount = 0;
let errorCount = 0;

for (const file of testFiles) {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    // Check if line 0 is /** and line 1 is an import from _helpers
    if (lines[0] === '/**' && lines[1] && lines[1].includes("from '@/tests/api/_helpers'")) {
      // Find where the JSDoc comment ends (looking for line with just ` */`)
      let jsdocEnd = -1;
      for (let i = 2; i < lines.length; i++) {
        if (lines[i].trim() === '*/') {
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
      
      // Reconstruct the file:
      // Line 0: /**
      // Lines 2 to jsdocEnd: rest of JSDoc (skip line 1 which is misplaced import)
      // After JSDoc: moved import
      // Rest of file
      
      const newLines = [
        lines[0], // /**
        ...lines.slice(2, jsdocEnd + 1), // rest of JSDoc (lines 2 through jsdocEnd, skip misplaced import on line 1)
        misplacedImport, // moved import after JSDoc closes
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
