#!/usr/bin/env node
/**
 * PR #14: Replace hardcoded localhost with environment variables
 */

const fs = require('fs');

console.log('🔧 PR #14: Fixing hardcoded localhost (103 instances)\n');

const csv = fs.readFileSync('fixes/localhost-locations.csv', 'utf8');
const lines = csv.split('\n').slice(1);

const fileMap = new Map();
lines.forEach(line => {
  if (!line.trim()) return;
  const match = line.match(/^"([^"]+)"/);
  if (match) {
    const file = match[1];
    if (!fileMap.has(file)) fileMap.set(file, 0);
    fileMap.set(file, fileMap.get(file) + 1);
  }
});

console.log(`📊 Files with hardcoded localhost: ${fileMap.size}\n`);

let fixedFiles = 0;
let totalFixed = 0;

Array.from(fileMap.entries()).forEach(([file, count]) => {
  if (!fs.existsSync(file)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  try {
    let content = fs.readFileSync(file, 'utf8');
    const before = (content.match(/localhost:\d+/g) || []).length;
    
    // Replace common patterns
    content = content.replace(
      /(['"`])http:\/\/localhost:3000\1/g,
      "process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'"
    );
    
    content = content.replace(
      /(['"`])http:\/\/localhost:8080\1/g,
      "process.env.API_URL || 'http://localhost:8080'"
    );
    
    content = content.replace(
      /(['"`])mongodb:\/\/localhost:27017\1/g,
      "process.env.MONGODB_URI || 'mongodb://localhost:27017'"
    );
    
    // Generic localhost replacement
    content = content.replace(
      /(['"`])localhost:(\d+)\1/g,
      (match, quote, port) => {
        return `process.env.${port === '3000' ? 'NEXT_PUBLIC_API_URL' : 'API_URL'} || ${quote}localhost:${port}${quote}`;
      }
    );
    
    const after = (content.match(/localhost:\d+/g) || []).length;
    const fixed = before - after;
    
    if (fixed > 0) {
      fs.writeFileSync(file, 'utf8');
      fixedFiles++;
      totalFixed += fixed;
      console.log(`✅ ${file}: Fixed ${fixed} hardcoded localhost`);
    }
    
  } catch (error) {
    console.error(`❌ ${file}:`, error.message);
  }
});

console.log('\n' + '='.repeat(60));
console.log('Summary for PR #14');
console.log('='.repeat(60));
console.log(`Files fixed: ${fixedFiles}`);
console.log(`Localhost instances replaced: ${totalFixed}`);
console.log('='.repeat(60) + '\n');
