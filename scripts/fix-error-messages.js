#!/usr/bin/env node

/**
 * Script to fix error message handling in API routes
 * Renames unused error variables and improves error handling
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function main() {
  console.log('🔍 Finding TypeScript files in app/api...');
  
  let files;
  try {
    const findCommand = 'find app/api -name "*.ts" -type f';
    const output = execSync(findCommand, { encoding: 'utf8' });
    
    if (!output || output.trim().length === 0) {
      console.error('❌ No TypeScript files found in app/api directory');
      process.exit(1);
    }
    
    files = output.trim().split('\n').filter(file => file.length > 0);
  } catch (error) {
    console.error(`❌ Error finding files: ${error.message}`);
    process.exit(1);
  }

  console.log(`📁 Found ${files.length} files to process`);

  let processedFiles = 0;
  let modifiedFiles = 0;

  for (const filePath of files) {
    try {
      processedFiles++;
      console.log(`\n📄 Processing ${filePath} (${processedFiles}/${files.length})`);
      
      // Validate file exists and is readable
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  File not found: ${filePath}`);
        continue;
      }

      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        console.warn(`⚠️  Not a file: ${filePath}`);
        continue;
      }

      let content;
      try {
        content = fs.readFileSync(filePath, 'utf8');
      } catch (error) {
        console.error(`❌ Error reading ${filePath}: ${error.message}`);
        continue;
      }

      const originalContent = content;
      let hasChanges = false;

      // Pattern 1: Fix catch (error: unknown) to catch (_error: unknown) when error is unused
      const catchPattern = /catch\s*\(\s*error\s*:\s*unknown\s*\)\s*\{([^}]*)\}/g;
      content = content.replace(catchPattern, (match, catchBody) => {
        // Check if 'error' is referenced in the catch block body
        const errorUsagePattern = /\berror\b/g;
        const errorReferences = (catchBody.match(errorUsagePattern) || []).length;
        
        // If error is not used in the catch body, rename it to _error
        if (errorReferences === 0) {
          hasChanges = true;
          console.log(`  🔧 Renamed unused error variable in catch block`);
          return match.replace('error:', '_error:');
        }
        
        return match;
      });

      // Pattern 2: Improve error handling patterns
      const badErrorPattern = /catch\s*\(\s*(_?error)\s*:\s*unknown\s*\)\s*\{\s*return\s+createSecureResponse\(\s*\{\s*error:\s*['"`]([^'"`]+)['"`]\s*\}\s*,\s*400\s*,\s*req\s*\)\s*;\s*\}/g;
      content = content.replace(badErrorPattern, (match, errorVar, errorMsg) => {
        hasChanges = true;
        console.log(`  🔧 Improved error handling pattern`);
        return `catch (${errorVar}: unknown) {
    console.error('${errorMsg}:', ${errorVar});
    return createSecureResponse({ error: '${errorMsg}' }, 500, req);
  }`;
      });

      // Only write if content changed
      if (hasChanges && content !== originalContent) {
        try {
          // Create backup
          const backupPath = `${filePath}.backup.${Date.now()}`;
          fs.copyFileSync(filePath, backupPath);
          
          fs.writeFileSync(filePath, content, 'utf8');
          modifiedFiles++;
          console.log(`  ✅ Modified and backed up to ${path.basename(backupPath)}`);
        } catch (error) {
          console.error(`  ❌ Error writing ${filePath}: ${error.message}`);
        }
      } else {
        console.log(`  ℹ️  No changes needed`);
      }

    } catch (error) {
      console.error(`❌ Error processing ${filePath}: ${error.message}`);
    }
  }

  console.log(`\n🎉 Processing complete!`);
  console.log(`📊 Files processed: ${processedFiles}`);
  console.log(`📝 Files modified: ${modifiedFiles}`);
  console.log(`📁 Files unchanged: ${processedFiles - modifiedFiles}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };