#!/usr/bin/env node
/**
 * i18n Translation Audit Script
 * 
 * Compares en.json (source) vs ar.json (target) to identify:
 * - Missing keys in Arabic
 * - Extra keys in Arabic (orphaned)
 * - Key count discrepancies
 * 
 * Usage: node scripts/i18n-audit.mjs
 * 
 * Exit codes:
 * 0 - All translations complete
 * 1 - Missing or extra keys found
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EN_PATH = path.join(__dirname, '../i18n/en.json');
const AR_PATH = path.join(__dirname, '../i18n/ar.json');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function flattenObject(obj, prefix = '') {
  const flattened = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, fullKey));
    } else {
      flattened[fullKey] = value;
    }
  }
  
  return flattened;
}

function loadJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    log(`❌ Error loading ${filePath}: ${error.message}`, 'red');
    process.exit(1);
  }
}

function main() {
  log('\n🔍 i18n Translation Audit', 'bold');
  log('━'.repeat(60), 'cyan');
  
  // Load translation files
  const enData = loadJSON(EN_PATH);
  const arData = loadJSON(AR_PATH);
  
  // Flatten nested objects to dot-notation keys
  const enKeys = flattenObject(enData);
  const arKeys = flattenObject(arData);
  
  const enKeySet = new Set(Object.keys(enKeys));
  const arKeySet = new Set(Object.keys(arKeys));
  
  // Find missing keys in Arabic
  const missingInAr = [...enKeySet].filter(key => !arKeySet.has(key));
  
  // Find extra keys in Arabic (not in English)
  const extraInAr = [...arKeySet].filter(key => !enKeySet.has(key));
  
  // Statistics
  log(`\n📊 Statistics:`, 'cyan');
  log(`  English keys:   ${enKeySet.size}`, 'white');
  log(`  Arabic keys:    ${arKeySet.size}`, 'white');
  log(`  Coverage:       ${((arKeySet.size / enKeySet.size) * 100).toFixed(2)}%`, arKeySet.size >= enKeySet.size ? 'green' : 'yellow');
  
  // Report missing keys
  if (missingInAr.length > 0) {
    log(`\n❌ Missing in Arabic (${missingInAr.length} keys):`, 'red');
    
    // Group by category (top-level key)
    const byCategory = {};
    missingInAr.forEach(key => {
      const category = key.split('.')[0];
      if (!byCategory[category]) byCategory[category] = [];
      byCategory[category].push(key);
    });
    
    Object.entries(byCategory).forEach(([category, keys]) => {
      log(`\n  ${category} (${keys.length}):`, 'yellow');
      keys.slice(0, 10).forEach(key => {
        const value = enKeys[key];
        const displayValue = typeof value === 'string' && value.length > 50
          ? value.substring(0, 50) + '...'
          : value;
        log(`    - ${key}: "${displayValue}"`, 'white');
      });
      if (keys.length > 10) {
        log(`    ... and ${keys.length - 10} more`, 'magenta');
      }
    });
  } else {
    log(`\n✅ All English keys are present in Arabic`, 'green');
  }
  
  // Report extra keys
  if (extraInAr.length > 0) {
    log(`\n⚠️  Extra in Arabic (${extraInAr.length} keys - may be orphaned):`, 'yellow');
    extraInAr.slice(0, 20).forEach(key => {
      log(`    - ${key}`, 'white');
    });
    if (extraInAr.length > 20) {
      log(`    ... and ${extraInAr.length - 20} more`, 'magenta');
    }
  }
  
  // Summary
  log('\n━'.repeat(60), 'cyan');
  if (missingInAr.length === 0 && extraInAr.length === 0) {
    log('✅ Translation audit passed! All keys are synchronized.', 'green');
    process.exit(0);
  } else {
    log(`❌ Translation audit failed:`, 'red');
    if (missingInAr.length > 0) {
      log(`   - ${missingInAr.length} keys missing in Arabic`, 'red');
    }
    if (extraInAr.length > 0) {
      log(`   - ${extraInAr.length} extra keys in Arabic (orphaned)`, 'yellow');
    }
    log('\n💡 Run: node scripts/i18n-fix.mjs --auto-add-missing', 'cyan');
    process.exit(1);
  }
}

main();
