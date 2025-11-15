#!/usr/bin/env node
/**
 * Fix Mongoose model declarations to use getModel() pattern
 * Converts: const X = models.X || model<IX>('X', XSchema)
 * To: const X = getModel<IX>('X', XSchema) as MModel<IX>
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TypeScript files in models/ and server/ directories
const files = glob.sync('{models,server,modules,lib}/**/*.ts', {
  cwd: __dirname + '/..',
  absolute: true,
  ignore: ['**/node_modules/**', '**/.next/**', '**/.archive*/**']
});

let totalFixed = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  const originalContent = content;

  // Check if file already imports from mongoose-compat
  const hasCompatImport = content.includes('from \'@/src/types/mongoose-compat\'');
  
  // Pattern 1: (models.X || model<IX>('X', XSchema)) as any
  // Pattern 2: (mongoose.models.X || mongoose.model<IX>('X', XSchema))
  // Pattern 3: models.X || model<IX>('X', XSchema)
  // Pattern 4: mongoose.models.X || mongoose.model<IX>('X', XSchema)
  
  // Regex to match various model declaration patterns
  const replacements = [];
  
  // Pattern 1: (models.X || model<IType>('Name', Schema))
  let regex1 = /\(models\.([A-Za-z0-9_]+)\s*\|\|\s*model<([A-Za-z0-9_<>, ]+)>\('([A-Za-z0-9_]+)',\s*([A-Za-z0-9_]+)\)\)/g;
  content = content.replace(regex1, (match, modelVar, typeName, modelName, schemaName) => {
    modified = true;
    return `getModel<${typeName}>('${modelName}', ${schemaName})`;
  });

  // Pattern 2: (mongoose.models.X || mongoose.model<IType>('Name', Schema))
  let regex2 = /\(mongoose\.models\.([A-Za-z0-9_]+)\s*\|\|\s*mongoose\.model<([A-Za-z0-9_<>, ]+)>\('([A-Za-z0-9_]+)',\s*([A-Za-z0-9_]+)\)\)/g;
  content = content.replace(regex2, (match, modelVar, typeName, modelName, schemaName) => {
    modified = true;
    return `getModel<${typeName}>('${modelName}', ${schemaName})`;
  });

  // Pattern 3: models.X || model<IType>('Name', Schema) [without parens at statement start]
  let regex3 = /(^|\s)models\.([A-Za-z0-9_]+)\s*\|\|\s*model<([A-Za-z0-9_<>, ]+)>\('([A-Za-z0-9_]+)',\s*([A-Za-z0-9_]+)\)/gm;
  content = content.replace(regex3, (match, prefix, modelVar, typeName, modelName, schemaName) => {
    modified = true;
    return `${prefix}getModel<${typeName}>('${modelName}', ${schemaName})`;
  });

  // Pattern 4: mongoose.models.X || mongoose.model<IType>('Name', Schema) [without parens]
  let regex4 = /(^|\s)mongoose\.models\.([A-Za-z0-9_]+)\s*\|\|\s*mongoose\.model<([A-Za-z0-9_<>, ]+)>\('([A-Za-z0-9_]+)',\s*([A-Za-z0-9_]+)\)/gm;
  content = content.replace(regex4, (match, prefix, modelVar, typeName, modelName, schemaName) => {
    modified = true;
    return `${prefix}getModel<${typeName}>('${modelName}', ${schemaName})`;
  });

  // Pattern 5: (models.X || model('Name', Schema)) [no generics]
  let regex5 = /\(models\.([A-Za-z0-9_]+)\s*\|\|\s*model\('([A-Za-z0-9_]+)',\s*([A-Za-z0-9_]+)\)\)/g;
  content = content.replace(regex5, (match, modelVar, modelName, schemaName) => {
    modified = true;
    return `getModel<any>('${modelName}', ${schemaName})`;
  });

  // Pattern 6: (mongoose.models.X || mongoose.model('Name', Schema)) [no generics]
  let regex6 = /\(mongoose\.models\.([A-Za-z0-9_]+)\s*\|\|\s*mongoose\.model\('([A-Za-z0-9_]+)',\s*([A-Za-z0-9_]+)\)\)/g;
  content = content.replace(regex6, (match, modelVar, modelName, schemaName) => {
    modified = true;
    return `getModel<any>('${modelName}', ${schemaName})`;
  });

  // Pattern 7: models.X || model('Name', Schema) [no generics, no parens]
  let regex7 = /(^|\s)models\.([A-Za-z0-9_]+)\s*\|\|\s*model\('([A-Za-z0-9_]+)',\s*([A-Za-z0-9_]+)\)/gm;
  content = content.replace(regex7, (match, prefix, modelVar, modelName, schemaName) => {
    modified = true;
    return `${prefix}getModel<any>('${modelName}', ${schemaName})`;
  });

  // Pattern 8: mongoose.models.X || mongoose.model('Name', Schema) [no generics, no parens]
  let regex8 = /(^|\s)mongoose\.models\.([A-Za-z0-9_]+)\s*\|\|\s*mongoose\.model\('([A-Za-z0-9_]+)',\s*([A-Za-z0-9_]+)\)/gm;
  content = content.replace(regex8, (match, prefix, modelVar, modelName, schemaName) => {
    modified = true;
    return `${prefix}getModel<any>('${modelName}', ${schemaName})`;
  });

  // Add import if needed and file was modified
  if (modified && !hasCompatImport) {
    // Find mongoose import line
    const mongooseImportMatch = content.match(/import\s+.*from\s+['"]mongoose['"]/);
    if (mongooseImportMatch) {
      const importLine = mongooseImportMatch[0];
      const importIndex = content.indexOf(importLine);
      const afterImport = importIndex + importLine.length;
      content = content.slice(0, afterImport) + 
                '\nimport { getModel, MModel } from \'@/src/types/mongoose-compat\';' +
                content.slice(afterImport);
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✓ Fixed ${path.relative(process.cwd(), file)}`);
    totalFixed++;
  }
});

console.log(`\nTotal files fixed: ${totalFixed}`);
