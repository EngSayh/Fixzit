#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function getAllTsxFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory() && !entry.name.includes('node_modules')) {
      getAllTsxFiles(fullPath, files);
    } else if (entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function fixTsxFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = content;
    
    // Only fix HTML entities in TSX files that shouldn't be there
    // Keep proper JSX entities like ' in JSX content, but fix them in JavaScript strings
    
    // Fix entities in string literals and template literals
    modified = modified.replace(/(['"`])([^'"`]*?)'([^'"`]*?)\1/g, "$1$2'$3$1");
    modified = modified.replace(/(['"`])([^'"`]*?)&quot;([^'"`]*?)\1/g, '$1$2"$3$1');
    modified = modified.replace(/(['"`])([^'"`]*?)<([^'"`]*?)\1/g, '$1$2<$3$1');
    modified = modified.replace(/(['"`])([^'"`]*?)>([^'"`]*?)\1/g, '$1$2>$3$1');
    modified = modified.replace(/(['"`])([^'"`]*?)&amp;([^'"`]*?)\1/g, '$1$2&$3$1');
    
    if (content !== modified) {
      fs.writeFileSync(filePath, modified);

      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {

  const files = getAllTsxFiles('./app');

  let modifiedCount = 0;
  
  for (const file of files) {
    if (fixTsxFile(file)) {
      modifiedCount++;
    }
  }

}

if (require.main === module) {
  main();
}