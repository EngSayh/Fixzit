#!/usr/bin/env node
/**
 * Merge Generated Translations into Main Catalog
 * 
 * This script merges the generated missing translations
 * into the main i18n/en.json and i18n/ar.json files.
 * 
 * Usage: node scripts/merge-translations.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Deep merge objects
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (target[key] && typeof target[key] === 'object') {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = { ...source[key] };
      }
    } else {
      // Only add if not already present
      if (!(key in target)) {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

// Read files
const enMainPath = path.join(ROOT, 'i18n/en.json');
const arMainPath = path.join(ROOT, 'i18n/ar.json');
const enMissingPath = path.join(ROOT, 'i18n/generated/missing-en.json');
const arMissingPath = path.join(ROOT, 'i18n/generated/missing-ar.json');

const enMain = JSON.parse(fs.readFileSync(enMainPath, 'utf-8'));
const arMain = JSON.parse(fs.readFileSync(arMainPath, 'utf-8'));
const enMissing = JSON.parse(fs.readFileSync(enMissingPath, 'utf-8'));
const arMissing = JSON.parse(fs.readFileSync(arMissingPath, 'utf-8'));

// Count existing keys
function countKeys(obj, prefix = '') {
  let count = 0;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      count += countKeys(obj[key], `${prefix}${key}.`);
    } else {
      count++;
    }
  }
  return count;
}

const enBeforeCount = countKeys(enMain);
const arBeforeCount = countKeys(arMain);

// Merge
const enMerged = deepMerge(enMain, enMissing);
const arMerged = deepMerge(arMain, arMissing);

const enAfterCount = countKeys(enMerged);
const arAfterCount = countKeys(arMerged);

// Write back
fs.writeFileSync(enMainPath, JSON.stringify(enMerged, null, 2) + '\n');
fs.writeFileSync(arMainPath, JSON.stringify(arMerged, null, 2) + '\n');

console.log('✅ Translations merged successfully!');
console.log(`\nEN translations: ${enBeforeCount} → ${enAfterCount} (+${enAfterCount - enBeforeCount})`);
console.log(`AR translations: ${arBeforeCount} → ${arAfterCount} (+${arAfterCount - arBeforeCount})`);

// Run audit again to check coverage
console.log('\n📊 Run audit to verify: node scripts/audit-translations.mjs');
