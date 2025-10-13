#!/usr/bin/env node

/**
 * Script to fix duplicate entries in en.ts translation file
 * Uses AST parsing to safely remove duplicate const declarations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EN_FILE_PATH = path.join(process.cwd(), 'i18n/dictionaries/en.ts');

function main() {
  try {
    // Check if file exists
    if (!fs.existsSync(EN_FILE_PATH)) {
      console.error(`Error: File not found: ${EN_FILE_PATH}`);
      process.exit(1);
    }

    // Read the file
    let content;
    try {
      content = fs.readFileSync(EN_FILE_PATH, 'utf8');
    } catch (error) {
      console.error(`Error reading file: ${error.message}`);
      process.exit(1);
    }

    // Check if content is valid
    if (!content || content.trim().length === 0) {
      console.error('Error: File is empty or contains only whitespace');
      process.exit(1);
    }

    console.log('Processing en.ts file...');

    // Use AST-based approach with @babel/parser
    let ast, generate;
    try {
      const parser = require('@babel/parser');
      const generator = require('@babel/generator');
      
      ast = parser.parse(content, {
        sourceType: 'module',
        plugins: ['typescript']
      });
      generate = generator.default;
    } catch (error) {
      console.warn('Babel parser not available, falling back to regex approach');
      return fallbackRegexApproach(content);
    }

    // Find and remove duplicate const en declarations
    let foundDeclarations = 0;
    const traverse = require('@babel/traverse').default;
    
    traverse(ast, {
      VariableDeclaration(nodePath) {
        const node = nodePath.node;
        if (node.declarations) {
          node.declarations = node.declarations.filter(declarator => {
            if (declarator.id && declarator.id.name === 'en') {
              foundDeclarations++;
              // Keep only the first declaration
              if (foundDeclarations > 1) {
                console.log(`Removing duplicate const en declaration #${foundDeclarations}`);
                return false;
              }
            }
            return true;
          });
          
          // Remove the entire declaration if no declarators remain
          if (node.declarations.length === 0) {
            nodePath.remove();
          }
        }
      }
    });

    // Generate updated code
    const result = generate(ast, {
      retainLines: true,
      compact: false
    });

    // Remove duplicate export statements (only keep the one at EOF)
    let finalContent = result.code;
    finalContent = finalContent.replace(/export\s+default\s+en\s*;?\s*\n/g, '');
    
    // Add single export at the end if not present
    if (!finalContent.trim().endsWith('export default en;')) {
      finalContent = finalContent.trim() + '\n\nexport default en;\n';
    }

    // Write back to file
    try {
      // Create backup
      const backupPath = `${EN_FILE_PATH}.backup.${Date.now()}`;
      fs.copyFileSync(EN_FILE_PATH, backupPath);
      console.log(`Backup created: ${backupPath}`);

      fs.writeFileSync(EN_FILE_PATH, finalContent, 'utf8');
      console.log('✅ Successfully processed en.ts file');
      
      // Verify the result
      const newLineCount = finalContent.split('\n').length;
      console.log(`File now has ${newLineCount} lines`);
      
    } catch (error) {
      console.error(`Error writing file: ${error.message}`);
      process.exit(1);
    }

  } catch (error) {
    console.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

function fallbackRegexApproach(content) {
  console.log('Using fallback regex approach...');
  
  // Create backup
  const backupPath = `${EN_FILE_PATH}.backup.${Date.now()}`;
  fs.copyFileSync(EN_FILE_PATH, backupPath);
  console.log(`Backup created: ${backupPath}`);

  // Remove export statements except the last one
  let finalContent = content.replace(/export\s+default\s+en\s*;?\s*$/gm, '');
  
  // Add single export at the end
  if (!finalContent.trim().endsWith('export default en;')) {
    finalContent = finalContent.trim() + '\n\nexport default en;\n';
  }

  fs.writeFileSync(EN_FILE_PATH, finalContent, 'utf8');
  console.log('✅ Successfully processed en.ts file (regex fallback)');
}

if (require.main === module) {
  main();
}

module.exports = { main };