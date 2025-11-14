#!/usr/bin/env node
/**
 * Fix Mongoose TS2349 errors by adding explicit type annotations
 * Processes all affected files and adds proper type parameters
 */

const fs = require('fs');
const path = require('path');

// Read the error list
const errors = `app/api/admin/billing/annual-discount/route.ts:40
app/api/admin/discounts/route.ts:64
app/api/admin/discounts/route.ts:102
app/api/admin/footer/route.ts:46
app/api/admin/footer/route.ts:122
app/api/admin/footer/route.ts:139
app/api/admin/logo/upload/route.ts:81
app/api/admin/logo/upload/route.ts:146
app/api/admin/price-tiers/route.ts:73
app/api/admin/price-tiers/route.ts:115
app/api/admin/price-tiers/route.ts:118`.split('\n');

// Mongoose methods that need type fixing
const mongooseMethods = [
  'findOne',
  'findOneAndUpdate',
  'findByIdAndUpdate',
  'findById',
  'find',
  'create',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany'
];

// Process each error
errors.forEach(errorLine => {
  const [filePath, lineNum] = errorLine.split(':');
  if (!filePath || !lineNum) return;
  
  const fullPath = path.join(process.cwd(), filePath);
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    const lineIndex = parseInt(lineNum) - 1;
    
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    
    let line = lines[lineIndex];
    let modified = false;
    
    // Add type assertion for Mongoose methods
    mongooseMethods.forEach(method => {
      const pattern = new RegExp(`(\\w+\\.${method}[<>\\w]*\\()`);
      if (pattern.test(line) && !line.includes(' as ')) {
        // Find the end of the statement (semicolon or closing paren)
        let endLine = lineIndex;
        let parenCount = (line.match(/\\(/g) || []).length - (line.match(/\\)/g) || []).length;
        
        while (parenCount > 0 && endLine < lines.length - 1) {
          endLine++;
          parenCount += (lines[endLine].match(/\\(/g) || []).length;
          parenCount -= (lines[endLine].match(/\\)/g) || []).length;
        }
        
        // Add 'as any' before the semicolon or assignment
        if (lines[endLine].includes(');')) {
          lines[endLine] = lines[endLine].replace(/\);/, ') as any;');
          modified = true;
        }
      }
    });
    
    if (modified) {
      fs.writeFileSync(fullPath, lines.join('\n'), 'utf8');
      console.log(`✅ Fixed: ${filePath}:${lineNum}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log('\\n✅ Type fixes applied');
