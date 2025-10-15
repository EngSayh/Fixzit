#!/usr/bin/env node

/**
 * Automated ESLint Error Fixing Script
 * 
 * This script addresses common ESLint errors across the codebase using pattern-based fixes.
 * It focuses on high-impact and easily fixable issues to improve code quality and maintainability.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const CONFIG = {
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  excludeDirs: ['node_modules', '.next', '_artifacts', 'public', 'packages/fixzit-souq-server'],
  backupDir: '.eslint-fixes-backup',
  dryRun: false // Set to true to see what would be changed without making changes
};

// Statistics tracking
const stats = {
  filesProcessed: 0,
  fixesApplied: 0,
  errors: []
};

// Fix patterns
const fixes = [
  {
    name: 'Fix mixed spaces and tabs',
    pattern: /^(\s*)\t+/gm,
    replacement: (match, spaces) => spaces + '  '.repeat(match.length - spaces.length),
    fileTypes: ['.js', '.ts', '.tsx', '.jsx']
  },
  {
    name: 'Fix useless escape characters in regex',
    pattern: /\\-/g,
    replacement: '-',
    fileTypes: ['.ts', '.tsx', '.js', '.jsx']
  },
  {
    name: 'Fix extra semicolons',
    pattern: /^(\s*);+/gm,
    replacement: '',
    fileTypes: ['.ts', '.tsx', '.js', '.jsx']
  },
  {
    name: 'Fix React unescaped entities (apostrophes)',
    pattern: /'/g,
    replacement: ''',
    fileTypes: ['.tsx', '.jsx'],
    condition: (content) => content.includes('export default') && content.includes('return (')
  },
  {
    name: 'Replace @ts-ignore with @ts-expect-error',
    pattern: /@ts-ignore/g,
    replacement: '@ts-expect-error',
    fileTypes: ['.ts', '.tsx']
  }
];

/**
 * Get all files to process
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!CONFIG.excludeDirs.includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else {
      const ext = path.extname(file);
      if (CONFIG.extensions.includes(ext)) {
        fileList.push(filePath);
      }
    }
  }
  
  return fileList;
}

/**
 * Apply fixes to a file
 */
function applyFixes(filePath) {
  try {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    let content = originalContent;
    let fileFixed = false;
    
    for (const fix of fixes) {
      const ext = path.extname(filePath);
      
      // Check if fix applies to this file type
      if (!fix.fileTypes.includes(ext)) continue;
      
      // Check condition if specified
      if (fix.condition && !fix.condition(content)) continue;
      
      // Apply the fix
      const newContent = content.replace(fix.pattern, fix.replacement);
      
      if (newContent !== content) {

        content = newContent;
        fileFixed = true;
        stats.fixesApplied++;
      }
    }
    
    // Write the fixed content back to file (if not dry run)
    if (fileFixed && !CONFIG.dryRun) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
    
    return fileFixed;
  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * Main execution
 */
function main() {}`);}`);

  // Get all files to process
  const files = getAllFiles('.');

  // Process each file
  for (const file of files) {
    stats.filesProcessed++;

    const wasFixed = applyFixes(file);
    if (!wasFixed) {

    }
  }
  
  // Summary

  if (stats.errors.length > 0) {

    stats.errors.forEach(({ file, error }) => {

    });
  }
  
  // Run ESLint check

  exec('npx eslint . --ext .ts,.tsx,.js,.jsx', (error, stdout, stderr) => {
    if (error) {

    } else {

    }

  });
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { fixes, applyFixes, getAllFiles };
