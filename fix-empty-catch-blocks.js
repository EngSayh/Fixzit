#!/usr/bin/env node
/**
 * Fix empty catch blocks by adding proper error handling
 */

const fs = require('fs');

console.log('🔧 إصلاح Empty Catch Blocks...\n');

// Read locations
const csv = fs.readFileSync('fixes/emptyCatch-locations.csv', 'utf8');
const lines = csv.split('\n').slice(1);

const files = new Set();
lines.forEach(line => {
  const match = line.match(/^"([^"]+)"/);
  if (match) files.add(match[1]);
});

console.log(`📊 عدد الملفات: ${files.size}\n`);

let fixedCount = 0;

Array.from(files).forEach(file => {
  try {
    if (!fs.existsSync(file)) return;
    
    let content = fs.readFileSync(file, 'utf8');
    const before = (content.match(/\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)/g) || []).length;
    
    // Replace empty catch blocks with proper error handling
    content = content.replace(
      /\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)/g,
      `.catch((error) => {
  // TODO: Add proper error handling
  console.error('Operation failed:', error);
})`
    );
    
    const after = (content.match(/\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)/g) || []).length;
    const fixed = before - after;
    
    if (fixed > 0) {
      fs.writeFileSync(file, content, 'utf8');
      fixedCount += fixed;
      console.log(`✅ ${file}: ${fixed} empty catch blocks`);
    }
    
  } catch (error) {
    console.error(`❌ ${file}:`, error.message);
  }
});

console.log(`\n✅ إجمالي الإصلاحات: ${fixedCount}\n`);
