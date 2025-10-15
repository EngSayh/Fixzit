#!/usr/bin/env node
/**
 * Fix en.ts by removing duplicates and ensuring single export
 */

const fs = require('fs');
const path = require('path');

const EN_FILE = path.join(__dirname, '../i18n/dictionaries/en.ts');

// Read the file
let content = fs.readFileSync(EN_FILE, 'utf-8');

// Remove any merge conflict markers if present
content = content.replace(/^<{7}.*$/gm, '');
content = content.replace(/^={7}.*$/gm, '');
content = content.replace(/^>{7}.*$/gm, '');

// Extract all object definitions
const objectPattern = /(?:export default|const \w+\s*=)\s*\{/g;
const matches = [...content.matchAll(objectPattern)];`);

// If we have multiple exports, we need to merge them
if (matches.length > 1) {

  // Parse the file more carefully to extract all key-value pairs
  // For now, let's remove duplicate export statements
  
  // Strategy: Keep only the first export default, remove others
  const firstExportIndex = content.indexOf('export default {');
  const constEnIndex = content.indexOf('const en = {');
  
  if (firstExportIndex !== -1 && constEnIndex !== -1) {
    if (firstExportIndex < constEnIndex) {
      // Remove const en declaration

      const lines = content.split('\n');
      const newLines = [];
      let inConstEn = false;
      let braceCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes('const en = {')) {
          inConstEn = true;
          braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
          continue;
        }
        
        if (inConstEn) {
          braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
          if (braceCount === 0) {
            inConstEn = false;
          }
          continue;
        }
        
        newLines.push(line);
      }
      
      content = newLines.join('\n');
    }
  }
}

// Remove any trailing "export default en" statements at the actual file end
// Use pattern without 'm' flag to match only at string end
content = content.replace(/(\n\s*export default en;?\s*)+$/, '');

// Ensure the file ends properly after the last closing brace
const lastBraceIndex = content.lastIndexOf('}');
if (lastBraceIndex !== -1) {
  // Extract content after the last brace
  const suffix = content.substring(lastBraceIndex + 1);
  
  // Check if suffix contains only whitespace and/or comments
  const hasOnlyWhitespaceOrComments = /^[\s\/\*]*$/.test(suffix);
  
  if (hasOnlyWhitespaceOrComments || suffix.trim() === '') {
    // Safe to add semicolon
    content = content.substring(0, lastBraceIndex + 1) + ';\n';
  } else {
    // Preserve non-whitespace content, insert semicolon after last brace
    content = content.substring(0, lastBraceIndex + 1) + ';' + suffix;
  }
}

// Write the fixed content back
fs.writeFileSync(EN_FILE, content, 'utf-8');

// Run a quick TypeScript check
const { execSync } = require('child_process');
try {
  execSync('npx tsc --noEmit i18n/dictionaries/en.ts', {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe'
  });

} catch (error) {');
  const output = error.stdout?.toString() || error.stderr?.toString() || '';
  const duplicateErrors = output.match(/Duplicate identifier '(\w+)'/g);
  if (duplicateErrors) {

  }
}
