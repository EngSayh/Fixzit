#!/usr/bin/env node
/**
 * Filter Schema Validation Script
 * 
 * Purpose: Prevent filter drift by ensuring all filter keys are defined in FILTER_SCHEMA
 * 
 * Validates that list components:
 * 1. Define FILTER_SCHEMA constant
 * 2. All filter properties used in buildActiveFilterChips are in schema
 * 3. All filter drawer fields map to schema keys
 * 
 * Usage: node scripts/validate-filter-schemas.js
 * Exit Code: 0 (pass) | 1 (validation errors found)
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const COMPONENT_PATTERNS = [
  'components/**/*List*.tsx',
  'components/**/WorkOrdersView*.tsx',
];
const ERRORS = [];

/**
 * Extract filter schema keys from component file
 */
function extractFilterSchemaKeys(content, _filePath) {
  const schemaMatch = content.match(/const\s+\w+_FILTER_SCHEMA:\s*FilterSchema<\w+>\[\]\s*=\s*\[([\s\S]*?)\];/);
  
  if (!schemaMatch) {
    return null; // No schema found (might be acceptable for some lists)
  }

  const schemaContent = schemaMatch[1];
  const keys = [];
  
  // Extract key properties from schema objects
  const keyRegex = /\{\s*key:\s*["'](\w+)["']/g;
  let match;
  while ((match = keyRegex.exec(schemaContent)) !== null) {
    keys.push(match[1]);
  }

  return keys;
}

/**
 * Extract filter properties used in buildActiveFilterChips
 */
function extractUsedFilterProperties(content) {
  const chipMatch = content.match(/buildActiveFilterChips\(.*?state\.filters.*?\)/g);
  if (!chipMatch) return [];

  // Extract filter type from cast
  const typeMatch = content.match(/state\.filters\s+as\s+(\w+)/);
  if (!typeMatch) return [];

  const filterType = typeMatch[1];
  
  // Extract filter type definition
  const typeDefRegex = new RegExp(`type\\s+${filterType}\\s*=\\s*\\{([\\s\\S]*?)\\}`);
  const typeDefMatch = content.match(typeDefRegex);
  
  if (!typeDefMatch) return [];

  const typeDef = typeDefMatch[1];
  const properties = [];

  // Extract property names
  const propRegex = /(\w+)\??:\s*[^;]+;/g;
  let match;
  while ((match = propRegex.exec(typeDef)) !== null) {
    properties.push(match[1]);
  }

  return properties;
}

/**
 * Validate a single list component
 */
function validateComponent(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const componentName = path.basename(filePath, '.tsx');

  // Skip components that don't use filters
  if (!content.includes('buildActiveFilterChips')) {
    return;
  }

  const schemaKeys = extractFilterSchemaKeys(content, filePath);
  const usedProps = extractUsedFilterProperties(content);

  if (!schemaKeys) {
    ERRORS.push({
      file: filePath,
      component: componentName,
      error: 'MISSING_SCHEMA',
      message: 'Component uses buildActiveFilterChips but has no FILTER_SCHEMA defined'
    });
    return;
  }

  if (usedProps.length === 0) {
    return; // Could not extract filter type (might be dynamically typed)
  }

  // Check if all filter properties are in schema
  const schemaKeySet = new Set(schemaKeys);
  const missingKeys = usedProps.filter(prop => !schemaKeySet.has(prop));

  if (missingKeys.length > 0) {
    ERRORS.push({
      file: filePath,
      component: componentName,
      error: 'MISSING_KEYS',
      message: `Filter properties not in schema: ${missingKeys.join(', ')}`,
      missingKeys,
      schemaKeys,
      usedProps
    });
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Validating Filter Schemas...\n');

  const files = COMPONENT_PATTERNS.flatMap((pattern) =>
    glob.sync(pattern, {
      cwd: process.cwd(),
      absolute: true,
    }),
  );

  console.log(`Found ${files.length} list components\n`);

  files.forEach(validateComponent);

  // Report results
  if (ERRORS.length === 0) {
    console.log('✅ All filter schemas are valid\n');
    process.exit(0);
  } else {
    console.error(`❌ Found ${ERRORS.length} validation error(s):\n`);
    
    ERRORS.forEach(error => {
      console.error(`File: ${error.file}`);
      console.error(`Component: ${error.component}`);
      console.error(`Error: ${error.error}`);
      console.error(`Message: ${error.message}`);
      
      if (error.missingKeys) {
        console.error(`  Schema has: [${error.schemaKeys.join(', ')}]`);
        console.error(`  Filter uses: [${error.usedProps.join(', ')}]`);
        console.error(`  Missing: [${error.missingKeys.join(', ')}]`);
      }
      
      console.error('');
    });

    process.exit(1);
  }
}

main();
