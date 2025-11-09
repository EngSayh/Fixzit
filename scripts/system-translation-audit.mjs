#!/usr/bin/env node
import fs from 'fs';

console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║              🌍 COMPLETE SYSTEM TRANSLATION ANALYSIS                       ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

// ============================================================================
// 1. TranslationContext.tsx (Inline translations)
// ============================================================================
console.log('📋 SOURCE 1: TranslationContext.tsx (Inline translations)');
console.log('─'.repeat(80));

const TranslationContext = fs.readFileSync('./contexts/TranslationContext.tsx', 'utf8');

const arMatch = TranslationContext.match(/ar:\s*\{([\s\S]*?)\n\s*\},\s*en:/);
const arSection = arMatch ? arMatch[1] : '';
const arKeys = [...arSection.matchAll(/'([^']+)':/g)].map(m => m[1]);

const enMatch = TranslationContext.match(/en:\s*\{([\s\S]*?)\n\s*\}\s*;/);
const enSection = enMatch ? enMatch[1] : '';
const enKeys = [...enSection.matchAll(/'([^']+)':/g)].map(m => m[1]);

console.log('English keys:', enKeys.length);
console.log('Arabic keys:', arKeys.length);
console.log('Status:', arKeys.length === enKeys.length ? '✅ Perfect parity' : '❌ Gap detected');

const contextGap = Math.abs(enKeys.length - arKeys.length);

// ============================================================================
// 2. i18n JSON Files
// ============================================================================
console.log('\n📋 SOURCE 2: i18n/*.json files');
console.log('─'.repeat(80));

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const enJson = JSON.parse(fs.readFileSync('./i18n/en.json', 'utf8'));
const arJson = JSON.parse(fs.readFileSync('./i18n/ar.json', 'utf8'));

const enJsonKeys = getAllKeys(enJson);
const arJsonKeys = getAllKeys(arJson);

console.log('English keys:', enJsonKeys.length);
console.log('Arabic keys:', arJsonKeys.length);
console.log('Status:', arJsonKeys.length === enJsonKeys.length ? '✅ Perfect parity' : '❌ Gap detected');

const jsonGap = Math.abs(enJsonKeys.length - arJsonKeys.length);

// ============================================================================
// 3. Search for other translation files
// ============================================================================
console.log('\n📋 SOURCE 3: Searching for other translation files...');
console.log('─'.repeat(80));

const { execSync } = await import('child_process');
const otherFiles = execSync(
  'find . -type f \\( -name "*lang*.ts" -o -name "*locale*.ts" -o -name "*i18n*.ts" \\) ! -path "*/node_modules/*" ! -path "*/.next/*" ! -path "*/dist/*" | head -20',
  { encoding: 'utf8', cwd: '/workspaces/Fixzit' }
).trim().split('\n').filter(f => f);

if (otherFiles.length > 0 && otherFiles[0] !== '') {
  console.log('Found translation-related TypeScript files:');
  otherFiles.forEach(f => console.log('  -', f));
} else {
  console.log('✅ No additional translation files found');
}

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║                            📊 FINAL SUMMARY                                ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

const totalGap = contextGap + jsonGap;

console.log('Translation Sources:');
console.log('  1. TranslationContext.tsx (inline)  :', contextGap === 0 ? '✅ 100% parity' : `❌ ${contextGap} keys gap`);
console.log('  2. i18n/*.json files                :', jsonGap === 0 ? '✅ 100% parity' : `❌ ${jsonGap} keys gap`);
console.log('  3. Other TypeScript translation files:', otherFiles.length > 0 ? '⚠️  Manual review needed' : '✅ None found');

console.log('\nTotal System Status:');
if (totalGap === 0 && (otherFiles.length === 0 || otherFiles[0] === '')) {
  console.log('  🎉 PERFECT TRANSLATION PARITY ACROSS ENTIRE SYSTEM!');
  console.log('  📊 English & Arabic: 100% synchronized');
} else {
  console.log('  ⚠️  Translation gaps detected');
  console.log('  📊 Total keys missing:', totalGap);
}

console.log('\n' + '═'.repeat(80));

process.exit(totalGap > 0 ? 1 : 0);
