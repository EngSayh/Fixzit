#!/usr/bin/env node
/**
 * Remove duplicate keys while preserving nested structure
 */

const fs = require('fs');
const path = require('path');

function removeDuplicates(filePath) {
  console.log(`\n📝 Processing: ${filePath}`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const seenKeys = new Map(); // Map of key -> {line, depth, kept}
  const linesToRemove = new Set();
  let currentDepth = 0;
  
  lines.forEach((line, index) => {
    // Track depth by counting braces
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    currentDepth += openBraces - closeBraces;
    
    // Match key patterns:  key: value,
    const keyMatch = line.match(/^\s+(\w+):\s*(["{]|[\w]+)/);
    if (keyMatch) {
      const key = keyMatch[1];
      const lineNum = index + 1;
      
      const keyId = `${key}_depth${currentDepth}`;
      
      if (seenKeys.has(keyId)) {
        // Duplicate found - mark for removal
        const firstOccurrence = seenKeys.get(keyId);
        console.log(`   ⚠️  Duplicate '${key}' at line ${lineNum} (first at ${firstOccurrence.line})`);
        
        // Mark this line and potentially the whole section for removal
        linesToRemove.add(index);
        
        // If next line is opening brace, mark whole section
        if (index + 1 < lines.length && lines[index + 1].trim() === '{') {
          let braceDepth = 1;
          let i = index + 2;
          linesToRemove.add(index + 1);
          
          while (i < lines.length && braceDepth > 0) {
            const l = lines[i];
            if (l.includes('{')) braceDepth++;
            if (l.includes('}')) braceDepth--;
            linesToRemove.add(i);
            if (braceDepth === 0) break;
            i++;
          }
        }
      } else {
        seenKeys.set(keyId, { line: lineNum, depth: currentDepth });
      }
    }
  });
  
  if (linesToRemove.size === 0) {
    console.log(`   ✅ No duplicates found`);
    return 0;
  }
  
  // Remove marked lines
  const newLines = lines.filter((_, index) => !linesToRemove.has(index));
  
  // Write back
  fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
  
  console.log(`   ✅ Removed ${linesToRemove.size} lines`);
  return linesToRemove.size;
}

function main() {
  const enPath = path.join(process.cwd(), 'i18n/dictionaries/en.ts');
  const arPath = path.join(process.cwd(), 'i18n/dictionaries/ar.ts');
  
  console.log('🔧 Removing duplicate keys (structure-aware)...');
  
  const enRemoved = removeDuplicates(enPath);
  const arRemoved = removeDuplicates(arPath);
  
  console.log(`\n📊 Summary:`);
  console.log(`   en.ts: ${enRemoved} lines removed`);
  console.log(`   ar.ts: ${arRemoved} lines removed`);
  console.log(`\n✅ Done! Run 'npm run typecheck' to verify.`);
}

main();
