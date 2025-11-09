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

// Extract all keys
const arKeys = [...arSection.matchAll(/'([^']+)':/g)].map(m => m[1]);
const enKeys = [...enSection.matchAll(/'([^']+)':/g)].map(m => m[1]);

const arSet = new Set(arKeys);
const enSet = new Set(enKeys);

// Scan codebase for used keys
function scanDirectory(dir, usedKeys = new Set()) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return usedKeys;
  }
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist' || entry.name === '.git') continue;
    
    if (entry.isDirectory()) {
      scanDirectory(fullPath, usedKeys);
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const matches = content.matchAll(/\bt\s*\(\s*['"]([^'"]+)['"]/g);
        for (const match of matches) {
          usedKeys.add(match[1]);
        }
      } catch (e) {}
    }
  }
  
  return usedKeys;
}

const usedKeys = new Set();
scanDirectory(path.join(__dirname, '../app'), usedKeys);
scanDirectory(path.join(__dirname, '../components'), usedKeys);
scanDirectory(path.join(__dirname, '../contexts'), usedKeys);
scanDirectory(path.join(__dirname, '../hooks'), usedKeys);

// Find missing keys
const missingKeys = [];
for (const key of usedKeys) {
  if (!enSet.has(key) || !arSet.has(key)) {
    missingKeys.push(key);
  }
}

// Group by module prefix
const modules = {};
for (const key of missingKeys) {
  const prefix = key.split('.')[0];
  if (!modules[prefix]) {
    modules[prefix] = [];
  }
  modules[prefix].push(key);
}

// Sort modules by count
const sortedModules = Object.entries(modules).sort((a, b) => b[1].length - a[1].length);

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║     MISSING TRANSLATIONS ORGANIZED BY MODULE                   ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('Total missing keys:', missingKeys.length);
console.log('Modules affected:', sortedModules.length);
console.log('\nBreakdown by module:\n');

sortedModules.forEach(([module, keys]) => {
  console.log(`${module.toUpperCase()}: ${keys.length} keys`);
});

console.log('\n' + '─'.repeat(70) + '\n');

// Generate translation files by module
const outputDir = path.join(__dirname, '../tmp/translations');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

sortedModules.forEach(([module, keys]) => {
  const output = {
    module,
    count: keys.length,
    keys: keys.sort(),
    translations: {}
  };
  
  // Create structure for each key
  keys.forEach(key => {
    output.translations[key] = {
      en: '',  // To be filled
      ar: '',  // To be filled
      notes: ''
    };
  });
  
  fs.writeFileSync(
    path.join(outputDir, `${module}-missing.json`),
    JSON.stringify(output, null, 2)
  );
  
  console.log(`✅ Created ${module}-missing.json (${keys.length} keys)`);
});

console.log('\n📁 Translation files saved to: tmp/translations/');
console.log('\n📝 Next steps:');
console.log('   1. Fill in translations in JSON files');
console.log('   2. Run: node scripts/apply-translations.mjs');
console.log('   3. Verify with: node scripts/comprehensive-translation-audit.mjs');
