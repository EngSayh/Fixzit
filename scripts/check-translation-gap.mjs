#!/usr/bin/env node
import fs from 'fs';

const TranslationContext = fs.readFileSync('./contexts/TranslationContext.tsx', 'utf8');

// Extract Arabic translations section
const arMatch = TranslationContext.match(/ar:\s*\{([\s\S]*?)\n\s*\},\s*en:/);
const arSection = arMatch ? arMatch[1] : '';
const arKeys = [...arSection.matchAll(/'([^']+)':/g)].map(m => m[1]);

// Extract English translations section  
const enMatch = TranslationContext.match(/en:\s*\{([\s\S]*?)\n\s*\}\s*;/);
const enSection = enMatch ? enMatch[1] : '';
const enKeys = [...enSection.matchAll(/'([^']+)':/g)].map(m => m[1]);

console.log('📊 Translation Key Analysis:');
console.log('English keys:', enKeys.length);
console.log('Arabic keys:', arKeys.length);
console.log('Gap:', Math.abs(enKeys.length - arKeys.length));

const arSet = new Set(arKeys);
const enSet = new Set(enKeys);

const missingInArabic = enKeys.filter(k => !arSet.has(k));
const missingInEnglish = arKeys.filter(k => !enSet.has(k));

if (missingInArabic.length > 0) {
  console.log('\n❌ Missing in Arabic (' + missingInArabic.length + ' keys):');
  missingInArabic.slice(0, 30).forEach(k => console.log('  - ' + k));
  if (missingInArabic.length > 30) console.log('  ... and ' + (missingInArabic.length - 30) + ' more');
}

if (missingInEnglish.length > 0) {
  console.log('\n❌ Missing in English (' + missingInEnglish.length + ' keys):');
  missingInEnglish.slice(0, 30).forEach(k => console.log('  - ' + k));
  if (missingInEnglish.length > 30) console.log('  ... and ' + (missingInEnglish.length - 30) + ' more');
}

// Save full lists
fs.writeFileSync('/tmp/missing-arabic.txt', missingInArabic.join('\n'));
fs.writeFileSync('/tmp/missing-english.txt', missingInEnglish.join('\n'));

console.log('\n📝 Full lists saved to:');
console.log('  /tmp/missing-arabic.txt');
console.log('  /tmp/missing-english.txt');

process.exit(missingInArabic.length > 0 || missingInEnglish.length > 0 ? 1 : 0);
