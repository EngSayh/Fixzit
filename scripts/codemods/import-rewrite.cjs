#!/usr/bin/env node
// @ts-check

/**
 * Import Rewrite Codemod
 * Normalizes import aliases (@/ → consistent usage)
 */

const fs = require('fs');
const path = require('path');
const { globbySync } = require('globby');

const ROOT = process.argv[2] || process.cwd();

async function rewriteImports() {
  console.log('🔧 Rewriting imports in:', ROOT);
  
  const files = globbySync('**/*.{ts,tsx,js,jsx}', {
    cwd: ROOT,
    ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**'],
    absolute: true,
  });

  let changedCount = 0;

  for (const file of files) {
    try {
      let content = fs.readFileSync(file, 'utf-8');
      const original = content;

      // Normalize @/ imports
      content = content.replace(/from ['"]@\/(.*?)['"]/g, (match, p1) => {
        // Ensure no double slashes
        const normalized = p1.replace(/\/+/g, '/');
        return `from '@/${normalized}'`;
      });

      // Normalize relative imports to use @/ when appropriate
      content = content.replace(/from ['"](\.\.\/)+([^'"]+)['"]/g, (match, dots, p2) => {
        // If going up more than 2 levels, consider using @/
        const levels = dots.match(/\.\.\//g)?.length || 0;
        if (levels > 2) {
          // Try to infer module path
          const relativePath = path.relative(ROOT, file);
          const dirDepth = relativePath.split(path.sep).length - 1;
          
          if (dirDepth >= levels) {
            // Can potentially use @/ alias
            return match; // Keep as-is for now (complex logic)
          }
        }
        return match;
      });

      if (content !== original) {
        fs.writeFileSync(file, content, 'utf-8');
        changedCount++;
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }

  console.log(`✅ Processed ${files.length} files, modified ${changedCount}`);
}

rewriteImports().catch(error => {
  console.error('❌ Import rewrite failed:', error);
  process.exit(1);
});
