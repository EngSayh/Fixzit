#!/usr/bin/env node

// cleanup-duplicate-imports.js
// Remove duplicate authenticate imports from enhancedAuth

const fs = require('fs');
const path = require('path');

console.log('🧹 CLEANING UP DUPLICATE IMPORTS...\n');

const routesDir = path.join(process.cwd(), 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

let cleanedCount = 0;

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Check if file has both imports
  const hasAuthImport = content.includes("const authenticate = require('../middleware/auth')");
  const hasEnhancedAuthImport = content.includes("require('../middleware/enhancedAuth')");
  
  if (hasAuthImport && hasEnhancedAuthImport) {
    console.log(`🔴 ${file} - Has duplicate imports!`);
    
    // Remove the enhancedAuth import line entirely
    content = content.replace(/.*require\(['"]\.\.\/middleware\/enhancedAuth['"]\).*\n/g, '');
    
    // Remove any references to ensureTenantIsolation since we're removing that import
    content = content.replace(/router\.use\(ensureTenantIsolation\);\n?/g, '');
    content = content.replace(/ensureTenantIsolation,?\s*/g, '');
    
    // Clean up any extra newlines
    content = content.replace(/\n{3,}/g, '\n\n');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ ${file} - Removed duplicate imports`);
      cleanedCount++;
    }
  } else if (hasEnhancedAuthImport && !hasAuthImport) {
    console.log(`⚠️  ${file} - Only has enhancedAuth import, converting...`);
    
    // Convert enhancedAuth import to regular auth import
    content = content.replace(
      /const\s*\{\s*authenticate[^}]*\}\s*=\s*require\(['"]\.\.\/middleware\/enhancedAuth['"]\);?/g,
      "const authenticate = require('../middleware/auth');"
    );
    
    // Remove ensureTenantIsolation usage
    content = content.replace(/router\.use\(ensureTenantIsolation\);\n?/g, '');
    content = content.replace(/ensureTenantIsolation,?\s*/g, '');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ ${file} - Converted to standard auth import`);
      cleanedCount++;
    }
  }
});

console.log(`\n📊 CLEANED UP ${cleanedCount} FILES\n`);
console.log('🚀 Ready to restart server!\n');