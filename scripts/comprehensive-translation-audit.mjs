#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read TranslationContext
const contextContent = fs.readFileSync(path.join(__dirname, '../contexts/TranslationContext.tsx'), 'utf8');

// Extract ar and en sections
const arMatch = contextContent.match(/ar:\s*\{([\s\S]*?)\n\s*\},\s*en:/);
const enMatch = contextContent.match(/en:\s*\{([\s\S]*?)\n\s*\}\s*;/);

const arSection = arMatch ? arMatch[1] : '';
const enSection = enMatch ? enMatch[1] : '';

// Extract all keys using regex
const arKeys = [...arSection.matchAll(/'([^']+)':/g)].map(m => m[1]);
const enKeys = [...enSection.matchAll(/'([^']+)':/g)].map(m => m[1]);

const arSet = new Set(arKeys);
const enSet = new Set(enKeys);

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║          COMPREHENSIVE TRANSLATION AUDIT                       ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('📊 TranslationContext.tsx Stats:');
console.log('  English keys:', enKeys.length);
console.log('  Arabic keys:', arKeys.length);
console.log('  Gap:', Math.abs(enKeys.length - arKeys.length));

// Find missing
const missingInAr = enKeys.filter(k => !arSet.has(k));
const missingInEn = arKeys.filter(k => !enSet.has(k));

if (missingInAr.length > 0) {
  console.log('\n❌ Missing in Arabic (' + missingInAr.length + ' keys):');
  missingInAr.forEach(k => console.log('  -', k));
}

if (missingInEn.length > 0) {
  console.log('\n❌ Missing in English (' + missingInEn.length + ' keys):');
  missingInEn.forEach(k => console.log('  -', k));
}

// Now scan ALL files for t('...') usage
console.log('\n\n🔍 Scanning ALL files for translation key usage...\n');

function scanDirectory(dir, usedKeys = new Set()) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return usedKeys;
  }
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip node_modules, .next, etc
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist' || entry.name === '.git') continue;
    
    if (entry.isDirectory()) {
      scanDirectory(fullPath, usedKeys);
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        // Match t('key') or t("key")
        const matches = content.matchAll(/\bt\s*\(\s*['"]([^'"]+)['"]/g);
        for (const match of matches) {
          usedKeys.add(match[1]);
        }
      } catch (e) {
        // Skip files that can't be read
      }
    }
  }
  
  return usedKeys;
}

const usedKeys = new Set();
scanDirectory(path.join(__dirname, '../app'), usedKeys);
scanDirectory(path.join(__dirname, '../components'), usedKeys);
scanDirectory(path.join(__dirname, '../contexts'), usedKeys);
scanDirectory(path.join(__dirname, '../hooks'), usedKeys);

console.log('Total translation keys USED in codebase:', usedKeys.size);

// Check which used keys are missing
const missingUsedKeys = [];
for (const key of usedKeys) {
  if (!enSet.has(key) || !arSet.has(key)) {
    missingUsedKeys.push({ key, inEN: enSet.has(key), inAR: arSet.has(key) });
  }
}

if (missingUsedKeys.length > 0) {
  console.log('\n❌ CRITICAL: Keys used in code but missing in translations:');
  missingUsedKeys.forEach(({key, inEN, inAR}) => {
    console.log('  -', key, '(EN:', inEN ? '✅' : '❌', 'AR:', inAR ? '✅' : '❌', ')');
  });
} else {
  console.log('\n✅ All used keys exist in both translations');
}

// Summary
console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                      FINAL SUMMARY                             ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');
console.log('Translation Catalog:');
console.log('  EN Keys:', enKeys.length);
console.log('  AR Keys:', arKeys.length);
console.log('  Status:', missingInAr.length === 0 && missingInEn.length === 0 ? '✅ 100% Parity' : '❌ Gap detected');
console.log('\nCodebase Usage:');
console.log('  Keys used:', usedKeys.size);
console.log('  Missing:', missingUsedKeys.length);
console.log('  Status:', missingUsedKeys.length === 0 ? '✅ All keys available' : '❌ Missing keys detected');

process.exit(missingInAr.length > 0 || missingInEn.length > 0 || missingUsedKeys.length > 0 ? 1 : 0);
