import { glob } from 'glob';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const TRANSLATION_FILES = [
  'i18n/locales/en/common.json',
  'i18n/locales/ar/common.json',
  'contexts/TranslationContext.tsx'
];

console.log('🔍 Scanning for missing i18n translation keys...\n');

// Load existing translations
const translations = { en: {}, ar: {} };

// Load from JSON files if they exist
for (const lang of ['en', 'ar']) {
  const jsonPath = `i18n/locales/${lang}/common.json`;
  if (existsSync(jsonPath)) {
    try {
      const content = JSON.parse(readFileSync(jsonPath, 'utf8'));
      translations[lang] = content;
      console.log(`✅ Loaded ${Object.keys(content).length} keys from ${jsonPath}`);
    } catch (err) {
      console.warn(`⚠️  Failed to parse ${jsonPath}: ${err.message}`);
    }
  }
}

// Parse TranslationContext.tsx if JSON files don't exist
if (existsSync('contexts/TranslationContext.tsx')) {
  try {
    const content = readFileSync('contexts/TranslationContext.tsx', 'utf8');
    
    // Extract English translations
    const enMatch = content.match(/const\s+englishTranslations\s*=\s*({[\s\S]*?});/);
    if (enMatch) {
      // Very basic object literal parsing - good enough for scanning
      const enKeys = [...enMatch[1].matchAll(/['"]([^'"]+)['"]\s*:/g)].map(m => m[1]);
      enKeys.forEach(key => { translations.en[key] = true; });
      console.log(`✅ Extracted ${enKeys.length} keys from TranslationContext (EN)`);
    }
    
    // Extract Arabic translations
    const arMatch = content.match(/const\s+arabicTranslations\s*=\s*({[\s\S]*?});/);
    if (arMatch) {
      const arKeys = [...arMatch[1].matchAll(/['"]([^'"]+)['"]\s*:/g)].map(m => m[1]);
      arKeys.forEach(key => { translations.ar[key] = true; });
      console.log(`✅ Extracted ${arKeys.length} keys from TranslationContext (AR)`);
    }
  } catch (err) {
    console.warn(`⚠️  Failed to parse TranslationContext.tsx: ${err.message}`);
  }
}

console.log(`\nTotal translation keys available: EN=${Object.keys(translations.en).length}, AR=${Object.keys(translations.ar).length}\n`);

// Scan all source files for translation usage
const sourceFiles = glob.sync('**/*.{tsx,ts,jsx,js}', {
  ignore: [
    'node_modules/**',
    '.next/**',
    'out/**',
    'build/**',
    'dist/**',
    'tests/**',
    'e2e-test-results/**',
    'playwright-report/**',
    '**/*.test.*',
    '**/*.spec.*'
  ]
});

console.log(`📂 Scanning ${sourceFiles.length} source files...\n`);

const usedKeys = new Set();
const missingKeys = {
  en: new Set(),
  ar: new Set()
};
const fileIssues = [];

// Common translation function patterns
const patterns = [
  /\bt\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,           // t('key')
  /\bt\s*\(\s*`([^`]+)`\s*\)/g,                      // t(`key`)
  /useTranslation\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g, // useTranslation('key')
  /translate\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g       // translate('key')
];

for (const file of sourceFiles) {
  try {
    const content = readFileSync(file, 'utf8');
    const fileKeys = new Set();
    
    for (const pattern of patterns) {
      const matches = [...content.matchAll(pattern)];
      matches.forEach(match => {
        const key = match[1];
        // Skip dynamic keys with variables
        if (!key.includes('${') && !key.includes('{') && key.length > 0) {
          usedKeys.add(key);
          fileKeys.add(key);
          
          // Check if key exists in both languages
          if (!translations.en[key]) {
            missingKeys.en.add(key);
          }
          if (!translations.ar[key]) {
            missingKeys.ar.add(key);
          }
        }
      });
    }
    
    // Check for hardcoded English text (basic heuristic)
    const suspiciousPatterns = [
      /<h[1-6][^>]*>\s*[A-Z][a-z]+/g,  // Headings with capitalized words
      /<button[^>]*>\s*[A-Z][a-z]+/g,  // Buttons with capitalized words
      /<label[^>]*>\s*[A-Z][a-z]+/g    // Labels with capitalized words
    ];
    
    let hasSuspiciousText = false;
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        hasSuspiciousText = true;
        break;
      }
    }
    
    if (hasSuspiciousText && fileKeys.size === 0) {
      fileIssues.push(`⚠️  ${file}: Contains UI text but no translation calls`);
    }
    
  } catch (err) {
    console.warn(`⚠️  Failed to read ${file}: ${err.message}`);
  }
}

console.log(`\n${'='.repeat(80)}`);
console.log('📊 SCAN RESULTS');
console.log('='.repeat(80));
console.log(`\n✅ Total unique translation keys used: ${usedKeys.size}`);
console.log(`❌ Missing English translations: ${missingKeys.en.size}`);
console.log(`❌ Missing Arabic translations: ${missingKeys.ar.size}`);

if (missingKeys.en.size > 0) {
  console.log(`\n${'─'.repeat(80)}`);
  console.log('❌ MISSING ENGLISH KEYS:');
  console.log('─'.repeat(80));
  [...missingKeys.en].sort().forEach(key => {
    console.log(`  - ${key}`);
  });
}

if (missingKeys.ar.size > 0) {
  console.log(`\n${'─'.repeat(80)}`);
  console.log('❌ MISSING ARABIC KEYS:');
  console.log('─'.repeat(80));
  [...missingKeys.ar].sort().forEach(key => {
    console.log(`  - ${key}`);
  });
}

if (fileIssues.length > 0) {
  console.log(`\n${'─'.repeat(80)}`);
  console.log('⚠️  POTENTIAL HARDCODED TEXT:');
  console.log('─'.repeat(80));
  fileIssues.slice(0, 20).forEach(issue => console.log(issue));
  if (fileIssues.length > 20) {
    console.log(`  ... and ${fileIssues.length - 20} more files`);
  }
}

console.log(`\n${'='.repeat(80)}\n`);

// Fail if there are missing keys (STRICT mode)
if (missingKeys.en.size > 0 || missingKeys.ar.size > 0) {
  console.error('❌ FAILED: Missing translation keys detected');
  console.error('   Add these keys to your translation dictionaries before proceeding.\n');
  process.exit(1);
}

console.log('✅ PASSED: All translation keys are defined\n');
process.exit(0);
