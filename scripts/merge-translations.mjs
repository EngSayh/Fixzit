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

// Helper to read and parse JSON files with error handling
function readJsonFile(filePath, description) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: ${description} not found at ${filePath}`);
    console.error('Run "node scripts/generate-missing-translations.mjs" first.');
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error(`Error: Failed to parse ${description} at ${filePath}`);
    console.error(err.message);
    process.exit(1);
  }
}

// Read files
const enMainPath = path.join(ROOT, 'i18n/en.json');
const arMainPath = path.join(ROOT, 'i18n/ar.json');
const enMissingPath = path.join(ROOT, 'i18n/generated/missing-en.json');
const arMissingPath = path.join(ROOT, 'i18n/generated/missing-ar.json');

const enMain = readJsonFile(enMainPath, 'EN main catalog');
const arMain = readJsonFile(arMainPath, 'AR main catalog');
const enMissing = readJsonFile(enMissingPath, 'EN missing translations');
const arMissing = readJsonFile(arMissingPath, 'AR missing translations');

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
