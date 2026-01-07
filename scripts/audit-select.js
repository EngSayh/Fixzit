const fs = require('fs');
const path = require('path');

function findFiles(dir, ext, results = []) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (file === 'node_modules' || file === '.next' || file === 'dist') continue;
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          findFiles(fullPath, ext, results);
        } else if (file.endsWith(ext)) {
          results.push(fullPath);
        }
      } catch (e) {}
    }
  } catch (e) {}
  return results;
}

const files = [...findFiles('app', '.tsx'), ...findFiles('components', '.tsx')];
let withClass = 0;
let withoutClass = 0;
const missing = [];

for (const file of files) {
  // Skip the base UI component
  if (file.includes('select.tsx') && file.includes('components')) continue;
  
  const content = fs.readFileSync(file, 'utf8');
  // Only check files that import from our Select component
  if (!content.includes("from '@/components/ui/select'") && !content.includes('from "@/components/ui/select"')) continue;
  
  // Match <Select with all attributes - handle JSX properly (including => in callbacks)
  // Use a more sophisticated approach: find <Select then scan until closing >
  let idx = 0;
  while (true) {
    const selectStart = content.indexOf('<Select', idx);
    if (selectStart === -1) break;
    
    // Make sure it's actually <Select (not <SelectItem or similar)
    const afterSelect = content.charAt(selectStart + 7);
    if (afterSelect !== ' ' && afterSelect !== '\n' && afterSelect !== '\r' && afterSelect !== '>') {
      idx = selectStart + 1;
      continue;
    }
    
    // Find the closing > by counting brackets
    let depth = 0;
    let end = selectStart + 7;
    let foundClose = false;
    while (end < content.length) {
      const char = content.charAt(end);
      if (char === '{') depth++;
      else if (char === '}') depth--;
      else if (char === '>' && depth === 0) {
        foundClose = true;
        break;
      }
      end++;
    }
    
    if (!foundClose) {
      idx = selectStart + 1;
      continue;
    }
    
    const attrs = content.substring(selectStart + 7, end);
    const lines = content.substring(0, selectStart).split('\n');
    const lineNum = lines.length;
    const relPath = file.replace(/\\/g, '/').replace(/.*Fixzit\//, '');
    
    if (attrs.includes('className=')) {
      withClass++;
    } else {
      withoutClass++;
      missing.push({ file: relPath, line: lineNum });
    }
    
    idx = end + 1;
  }
}

console.log('=== SELECT COMPONENT AUDIT ===');
console.log('WITH className: ' + withClass);
console.log('WITHOUT className: ' + withoutClass);
console.log('TOTAL: ' + (withClass + withoutClass));
console.log('FIX RATE: ' + (withClass / (withClass + withoutClass) * 100).toFixed(1) + '%');
console.log('');
console.log('=== MISSING className (' + withoutClass + ') ===');
missing.forEach(m => console.log(m.file + ':' + m.line));
