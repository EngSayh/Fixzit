#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to find duplicate route handlers
function findDuplicateRoutes() {
  const routesDir = path.join(__dirname, '../packages/fixzit-souq-server/routes');
  const routes = new Map();
  
  fs.readdirSync(routesDir).forEach(file => {
    if (file.endsWith('.js')) {
      const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
      const routeMatches = content.match(/router\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g) || [];
      
      routeMatches.forEach(match => {
        const [method, route] = match.replace('router.', '').replace(/['"]/g, '').split('(');
        const key = `${method.toUpperCase()} ${route}`;
        
        if (!routes.has(key)) {
          routes.set(key, []);
        }
        routes.get(key).push(file);
      });
    }
  });
  
  // Find duplicates
  const duplicates = [];
  routes.forEach((files, route) => {
    if (files.length > 1) {
      duplicates.push({ route, files });
    }
  });
  
  return duplicates;
}

// Function to consolidate error handling
function consolidateErrorHandling() {
  const routesDir = path.join(__dirname, '../packages/fixzit-souq-server/routes');
  let updated = 0;
  
  fs.readdirSync(routesDir).forEach(file => {
    if (file.endsWith('.js')) {
      const filePath = path.join(routesDir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      // Standardize catch blocks to use 'error' variable
      content = content.replace(/catch\s*\(\s*e\s*\)/g, 'catch (error)');
      content = content.replace(/catch\s*\(\s*err\s*\)/g, 'catch (error)');
      
      // Standardize error responses
      content = content.replace(/res\.status\(500\)\.json\(\{\s*success:\s*false,\s*error:\s*e\.message\s*\}\)/g, 
        'res.status(500).json({ success: false, error: error.message })');
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        updated++;
        console.log(`✅ Updated error handling in ${file}`);
      }
    }
  });
  
  return updated;
}

// Function to remove duplicate imports
function removeDuplicateImports() {
  const appDir = path.join(__dirname, '../app');
  let updated = 0;
  
  function processFile(filePath) {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      // Extract all imports
      const importRegex = /^import\s+.*?from\s+['"].*?['"];?\s*$/gm;
      const imports = content.match(importRegex) || [];
      
      // Remove duplicate imports
      const uniqueImports = [...new Set(imports)];
      
      if (imports.length !== uniqueImports.length) {
        // Replace imports section
        const firstImportIndex = content.indexOf(imports[0]);
        const lastImportIndex = content.lastIndexOf(imports[imports.length - 1]) + imports[imports.length - 1].length;
        
        content = content.substring(0, firstImportIndex) + 
                  uniqueImports.join('\n') + 
                  content.substring(lastImportIndex);
        
        fs.writeFileSync(filePath, content);
        updated++;
        console.log(`✅ Removed duplicate imports in ${path.relative(__dirname, filePath)}`);
      }
    }
  }
  
  function walkDir(dir) {
    fs.readdirSync(dir).forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        walkDir(filePath);
      } else if (stat.isFile()) {
        processFile(filePath);
      }
    });
  }
  
  walkDir(appDir);
  return updated;
}

// Main execution
console.log('🔍 Scanning for duplicates and optimizing code...\n');

// Find duplicate routes
const duplicateRoutes = findDuplicateRoutes();
if (duplicateRoutes.length > 0) {
  console.log('⚠️  Found duplicate routes:');
  duplicateRoutes.forEach(({ route, files }) => {
    console.log(`   ${route} in: ${files.join(', ')}`);
  });
  console.log('');
} else {
  console.log('✅ No duplicate routes found\n');
}

// Consolidate error handling
console.log('🔧 Consolidating error handling...');
const errorHandlingUpdated = consolidateErrorHandling();
console.log(`   Updated ${errorHandlingUpdated} files\n`);

// Remove duplicate imports
console.log('🔧 Removing duplicate imports...');
const importsUpdated = removeDuplicateImports();
console.log(`   Updated ${importsUpdated} files\n`);

console.log('✨ Optimization complete!');