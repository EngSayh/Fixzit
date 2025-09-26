#!/usr/bin/env node

/**
 * ESLint Error Fixing Script
 * 
 * This script helps automate fixing common ESLint errors across the codebase.
 * Run with: node scripts/fix-eslint-errors.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Common patterns to fix
const FIXES = {
  // Fix useless escape characters
  uselessEscapes: {
    pattern: /\\([\-\+\(\)])/g,
    replacement: '$1',
    description: 'Remove unnecessary escape characters'
  },
  
  // Fix @ts-ignore to @ts-expect-error
  tsIgnore: {
    pattern: /\/\/ @ts-ignore/g,
    replacement: '// @ts-expect-error',
    description: 'Replace @ts-ignore with @ts-expect-error'
  },
  
  // Fix extra semicolons at start of lines
  extraSemicolons: {
    pattern: /^\s*;(\()/gm,
    replacement: '    $1',
    description: 'Remove unnecessary semicolons'
  },

  // Fix React unescaped entities
  reactQuotes: {
    pattern: /([^&])'([^s])/g,
    replacement: '$1&apos;$2',
    description: 'Escape single quotes in React'
  }
};

// File extensions to process
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

function shouldProcessFile(filePath) {
  // Skip node_modules, .git, and other irrelevant directories
  if (filePath.includes('node_modules') || 
      filePath.includes('.git') || 
      filePath.includes('dist') ||
      filePath.includes('build')) {
    return false;
  }
  
  return EXTENSIONS.some(ext => filePath.endsWith(ext));
}

function getAllFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      getAllFiles(fullPath, files);
    } else if (shouldProcessFile(fullPath)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function applyFixes(filePath, content) {
  let modified = content;
  let changesMade = [];
  
  for (const [name, fix] of Object.entries(FIXES)) {
    const before = modified;
    modified = modified.replace(fix.pattern, fix.replacement);
    
    if (before !== modified) {
      changesMade.push(fix.description);
    }
  }
  
  return { content: modified, changes: changesMade };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, changes } = applyFixes(filePath, content);
    
    if (changes.length > 0) {
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ ${filePath}: ${changes.join(', ')}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Starting ESLint error fixes...\n');
  
  const rootDir = process.cwd();
  const files = getAllFiles(rootDir);
  
  console.log(`📁 Found ${files.length} files to process\n`);
  
  let processedCount = 0;
  let modifiedCount = 0;
  
  for (const file of files) {
    processedCount++;
    
    if (processedCount % 50 === 0) {
      console.log(`📊 Progress: ${processedCount}/${files.length} files processed`);
    }
    
    if (processFile(file)) {
      modifiedCount++;
    }
  }
  
  console.log(`\n✨ Completed! Modified ${modifiedCount} out of ${processedCount} files`);
  
  // Run ESLint to check remaining issues
  try {
    console.log('\n🔍 Running ESLint to check remaining issues...');
    const result = execSync('npx eslint . --ext .ts,.tsx,.js,.jsx --max-warnings 0', 
      { encoding: 'utf8', stdio: 'pipe' });
    console.log('🎉 All ESLint errors fixed!');
  } catch (error) {
    console.log('\n📋 Remaining ESLint issues:');
    console.log(error.stdout || error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { FIXES, processFile };