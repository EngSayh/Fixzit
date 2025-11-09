#!/usr/bin/env node
import fs from 'fs';

const enJson = JSON.parse(fs.readFileSync('./i18n/en.json', 'utf8'));
const arJson = JSON.parse(fs.readFileSync('./i18n/ar.json', 'utf8'));

// Flatten nested objects to get all keys
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

const enKeys = getAllKeys(enJson);
const arKeys = getAllKeys(arJson);

console.log('📊 i18n JSON Files Translation Analysis:');
console.log('English keys:', enKeys.length);
console.log('Arabic keys:', arKeys.length);
console.log('Gap:', Math.abs(enKeys.length - arKeys.length));

const enSet = new Set(enKeys);
const arSet = new Set(arKeys);

const missingInArabic = enKeys.filter(k => !arSet.has(k));
const missingInEnglish = arKeys.filter(k => !enSet.has(k));

if (missingInArabic.length > 0) {
  console.log('\n❌ Missing in Arabic (' + missingInArabic.length + ' keys):');
  missingInArabic.slice(0, 50).forEach(k => console.log('  - ' + k));
  if (missingInArabic.length > 50) console.log('  ... and ' + (missingInArabic.length - 50) + ' more');
}

if (missingInEnglish.length > 0) {
  console.log('\n❌ Missing in English (' + missingInEnglish.length + ' keys):');
  missingInEnglish.slice(0, 50).forEach(k => console.log('  - ' + k));
  if (missingInEnglish.length > 50) console.log('  ... and ' + (missingInEnglish.length - 50) + ' more');
}

fs.writeFileSync('/tmp/json-missing-arabic.txt', missingInArabic.join('\n'));
fs.writeFileSync('/tmp/json-missing-english.txt', missingInEnglish.join('\n'));

console.log('\n💾 Full reports saved to:');
console.log('  /tmp/json-missing-arabic.txt (' + missingInArabic.length + ' keys)');
console.log('  /tmp/json-missing-english.txt (' + missingInEnglish.length + ' keys)');

process.exit(missingInArabic.length > 0 || missingInEnglish.length > 0 ? 1 : 0);
