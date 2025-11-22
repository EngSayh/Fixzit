#!/usr/bin/env node
/**
 * Replace console.* with logger.* in specified files
 * Usage: node scripts/replace-console-with-logger.mjs <file-pattern>
 */

import fs from 'fs';
import { glob } from 'glob';

const LOGGER_IMPORT = "import { logger } from '@/lib/logger';";

function replaceConsoleInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let replacements = 0;

  // Check if logger import exists
  const hasLoggerImport = content.includes(LOGGER_IMPORT) || content.includes("from '@/lib/logger'");
  
  // Count console statements
  const consoleMatches = content.match(/console\.(log|error|warn|info)/g);
  if (!consoleMatches || consoleMatches.length === 0) {
    return { modified: false, replacements: 0 };
  }

  // Add logger import if needed (after first import statement)
  if (!hasLoggerImport) {
    // Find the last import statement
    const importRegex = /^import\s+.+from\s+['"][^'"]+['"];?\s*$/gm;
    const imports = content.match(importRegex);
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertPosition = lastImportIndex + lastImport.length;
      content = content.slice(0, insertPosition) + '\n' + LOGGER_IMPORT + content.slice(insertPosition);
      modified = true;
    }
  }

  // Replace console.error with logger.error
  content = content.replace(/console\.error\(['"]([^'"]+)['"]\s*,\s*(\w+)\)/g, (match, msg, varName) => {
    replacements++;
    return `logger.error('${msg}', { ${varName} })`;
  });
  
  content = content.replace(/console\.error\(['"]([^'"]+)['"]\)/g, (match, msg) => {
    replacements++;
    return `logger.error('${msg}')`;
  });

  // Replace console.log with logger.info
  content = content.replace(/console\.log\(['"]([^'"]+)['"]\s*,\s*(\w+)\)/g, (match, msg, varName) => {
    replacements++;
    return `logger.info('${msg}', { ${varName} })`;
  });
  
  content = content.replace(/console\.log\(['"]([^'"]+)['"]\)/g, (match, msg) => {
    replacements++;
    return `logger.info('${msg}')`;
  });

  // Replace console.warn with logger.warn
  content = content.replace(/console\.warn\(['"]([^'"]+)['"]\s*,\s*(\w+)\)/g, (match, msg, varName) => {
    replacements++;
    return `logger.warn('${msg}', { ${varName} })`;
  });
  
  content = content.replace(/console\.warn\(['"]([^'"]+)['"]\)/g, (match, msg) => {
    replacements++;
    return `logger.warn('${msg}')`;
  });

  if (replacements > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    modified = true;
  }

  return { modified, replacements };
}

// Main execution
const pattern = process.argv[2] || 'app/**/*.{ts,tsx}';
const files = glob.sync(pattern, { 
  ignore: ['**/node_modules/**', '**/*.test.ts', '**/*.test.tsx', '**/tests/**']
});

console.log(`Found ${files.length} files matching pattern: ${pattern}\n`);

let totalModified = 0;
let totalReplacements = 0;

for (const file of files) {
  const { modified, replacements } = replaceConsoleInFile(file);
  if (modified) {
    totalModified++;
    totalReplacements += replacements;
    console.log(`✓ ${file}: ${replacements} replacements`);
  }
}

console.log(`\n✅ Complete: ${totalModified} files modified, ${totalReplacements} total replacements`);
