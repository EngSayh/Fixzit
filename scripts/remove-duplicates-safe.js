#!/usr/bin/env node
/**
 * Remove duplicate keys while preserving nested structure
 */

const fs = require('fs');
const path = require('path');

function removeDuplicates(filePath) {

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const seenKeys = new Map(); // Map of key -> {line, depth, kept}
  const linesToRemove = new Set();
  let currentDepth = 0;
  
  lines.forEach((line, index) => {
    // Track depth by counting braces (string-aware)
    // Simple state machine to ignore braces inside strings
    let inString = false;
    let stringChar = null;
    let escaped = false;
    let openCount = 0;
    let closeCount = 0;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (escaped) {
        escaped = false;
        continue;
      }
      
      if (char === '\\') {
        escaped = true;
        continue;
      }
      
      // Toggle string state
      if ((char === '"' || char === "'" || char === '`') && !inString) {
        inString = true;
        stringChar = char;
        continue;
      } else if (char === stringChar && inString) {
        inString = false;
        stringChar = null;
        continue;
      }
      
      // Only count braces outside strings
      if (!inString) {
        if (char === '{') openCount++;
        if (char === '}') closeCount++;
      }
    }
    
    currentDepth += openCount - closeCount;
    
    // Match key patterns:  key: value,
    const keyMatch = line.match(/^\s+(\w+):\s*(["{]|[\w]+)/);
    if (keyMatch) {
      const key = keyMatch[1];
      const lineNum = index + 1;
      
      const keyId = `${key}_depth${currentDepth}`;
      
      if (seenKeys.has(keyId)) {
        // Duplicate found - mark for removal
        const firstOccurrence = seenKeys.get(keyId);`);
        
        // Mark this line and potentially the whole section for removal
        linesToRemove.add(index);
        
        // If next line is opening brace, mark whole section (string-aware)
        if (index + 1 < lines.length && lines[index + 1].trim() === '{') {
          let braceDepth = 1;
          let i = index + 2;
          linesToRemove.add(index + 1);
          
          while (i < lines.length && braceDepth > 0) {
            const l = lines[i];
            
            // Count braces outside strings
            let inStr = false;
            let strChar = null;
            let esc = false;
            
            for (let j = 0; j < l.length; j++) {
              const c = l[j];
              if (esc) { esc = false; continue; }
              if (c === '\\') { esc = true; continue; }
              if ((c === '"' || c === "'" || c === '`') && !inStr) {
                inStr = true;
                strChar = c;
              } else if (c === strChar && inStr) {
                inStr = false;
                strChar = null;
              }
              if (!inStr) {
                if (c === '{') braceDepth++;
                if (c === '}') braceDepth--;
              }
            }
            
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

    return 0;
  }
  
  // Remove marked lines
  const newLines = lines.filter((_, index) => !linesToRemove.has(index));
  
  // Write back
  fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');

  return linesToRemove.size;
}

function main() {
  const enPath = path.join(process.cwd(), 'i18n/dictionaries/en.ts');
  const arPath = path.join(process.cwd(), 'i18n/dictionaries/ar.ts');...');
  
  const enRemoved = removeDuplicates(enPath);
  const arRemoved = removeDuplicates(arPath);

}

main();
