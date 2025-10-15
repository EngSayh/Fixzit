#!/usr/bin/env node
/**
 * Auto-fix console statements in scripts folder
 * This is safe because scripts are not production code
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 بدء إصلاح console statements...\n');

// Read console.log locations
const consoleLogCSV = fs.readFileSync('fixes/consoleLog-locations.csv', 'utf8');
const consoleDebugCSV = fs.readFileSync('fixes/consoleDebug-locations.csv', 'utf8');
const consoleInfoCSV = fs.readFileSync('fixes/consoleInfo-locations.csv', 'utf8');
const consoleWarnCSV = fs.readFileSync('fixes/consoleWarn-locations.csv', 'utf8');

// Parse CSV and get files in scripts folder only
function parseCSV(csv) {
  const lines = csv.split('\n').slice(1); // Skip header
  const files = new Set();
  
  lines.forEach(line => {
    const match = line.match(/^"([^"]+)"/);
    if (match) {
      const file = match[1];
      // Only process scripts folder and root level scripts
      if (file.startsWith('scripts/') || file.match(/^[^/]+\.(js|ts)$/) && file.includes('test')) {
        files.add(file);
      }
    }
  });
  
  return Array.from(files);
}

const consoleLogFiles = parseCSV(consoleLogCSV);
const consoleDebugFiles = parseCSV(consoleDebugCSV);
const consoleInfoFiles = parseCSV(consoleInfoCSV);
const consoleWarnFiles = parseCSV(consoleWarnCSV);

const allFiles = new Set([
  ...consoleLogFiles,
  ...consoleDebugFiles,
  ...consoleInfoFiles,
  ...consoleWarnFiles
]);

console.log(`📊 إحصائيات:`);
console.log(`  - ملفات console.log: ${consoleLogFiles.length}`);
console.log(`  - ملفات console.debug: ${consoleDebugFiles.length}`);
console.log(`  - ملفات console.info: ${consoleInfoFiles.length}`);
console.log(`  - ملفات console.warn: ${consoleWarnFiles.length}`);
console.log(`  - إجمالي الملفات الفريدة: ${allFiles.size}\n`);

let fixedFiles = 0;
let removedStatements = 0;

// Process each file
Array.from(allFiles).forEach(file => {
  try {
    if (!fs.existsSync(file)) {
      console.log(`⚠️  الملف غير موجود: ${file}`);
      return;
    }
    
    let content = fs.readFileSync(file, 'utf8');
    const originalLength = content.length;
    
    // Count removals
    const before = {
      log: (content.match(/console\.log\(/g) || []).length,
      debug: (content.match(/console\.debug\(/g) || []).length,
      info: (content.match(/console\.info\(/g) || []).length,
      warn: (content.match(/console\.warn\(/g) || []).length
    };
    
    // Remove console statements (keep console.error for now)
    // Remove standalone console.log lines
    content = content.replace(/^\s*console\.log\([^)]*\);?\s*$/gm, '');
    content = content.replace(/^\s*console\.debug\([^)]*\);?\s*$/gm, '');
    content = content.replace(/^\s*console\.info\([^)]*\);?\s*$/gm, '');
    content = content.replace(/^\s*console\.warn\([^)]*\);?\s*$/gm, '');
    
    // Remove inline console statements
    content = content.replace(/\s*console\.log\([^)]*\);?/g, '');
    content = content.replace(/\s*console\.debug\([^)]*\);?/g, '');
    content = content.replace(/\s*console\.info\([^)]*\);?/g, '');
    content = content.replace(/\s*console\.warn\([^)]*\);?/g, '');
    
    // Clean up multiple empty lines (max 2 consecutive)
    content = content.replace(/\n\n\n+/g, '\n\n');
    
    const after = {
      log: (content.match(/console\.log\(/g) || []).length,
      debug: (content.match(/console\.debug\(/g) || []).length,
      info: (content.match(/console\.info\(/g) || []).length,
      warn: (content.match(/console\.warn\(/g) || []).length
    };
    
    const removed = (before.log - after.log) + (before.debug - after.debug) + 
                    (before.info - after.info) + (before.warn - after.warn);
    
    if (content.length !== originalLength) {
      fs.writeFileSync(file, content, 'utf8');
      fixedFiles++;
      removedStatements += removed;
      console.log(`✅ ${file}: أزال ${removed} statements`);
    }
    
  } catch (error) {
    console.error(`❌ خطأ في معالجة ${file}:`, error.message);
  }
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('📊 ملخص الإصلاحات');
console.log('═══════════════════════════════════════════════════════════');
console.log(`✅ عدد الملفات المُعدلة: ${fixedFiles}`);
console.log(`✅ console statements المُزالة: ${removedStatements}`);
console.log('═══════════════════════════════════════════════════════════\n');
