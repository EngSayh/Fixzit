#!/usr/bin/env node
/**
 * Fix Missing Translation Keys
 * 
 * This script automatically adds missing translation keys to source files
 * based on the audit results from audit-translations.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Run audit to get missing keys
import { execSync } from 'child_process';

console.log('🔍 Running translation audit...');
let auditOutput;
try {
  auditOutput = execSync('node scripts/audit-translations.mjs', { 
    cwd: ROOT,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
} catch (err) {
  // The audit script exits with status 1 when missing keys are found
  // We need its output anyway
  auditOutput = err.stdout || '';
  if (!auditOutput) {
    console.error('❌ Failed to run audit script');
    process.exit(1);
  }
}

// Parse missing keys
const missingKeys = [];
const lines = auditOutput.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.includes('(EN: ❌  AR: ❌)')) {
    // Extract key name: "  - admin.footer.accessDenied  (EN: ❌  AR: ❌)"
    const match = line.match(/^-\s+(.+?)\s+\(EN:/);
    if (match) {
      const key = match[1].trim();
      // Only process keys that contain dots (real translation keys)
      // Skip things like "Credit/Debit Card" which don't have dots
      if (!key.includes('.')) {
        continue;
      }
      // Get usage info from next line
      const usageLine = lines[i + 1];
      const usageMatch = usageLine?.match(/Used in: (.+)$/);
      const files = usageMatch ? usageMatch[1].split(', ').map(f => f.replace('Fixzit/', '')) : [];
      missingKeys.push({ key, files });
    }
  }
}

console.log(`📊 Found ${missingKeys.length} missing keys`);

// Group keys by domain (first part before first dot)
const keysByDomain = {};
for (const { key, files } of missingKeys) {
  const domain = key.split('.')[0];
  if (!keysByDomain[domain]) {
    keysByDomain[domain] = [];
  }
  keysByDomain[domain].push({ key, files });
}

console.log(`📁 Grouped into ${Object.keys(keysByDomain).length} domains`);

// Generate English translations based on key names
function generateEnglishTranslation(key) {
  const parts = key.split('.');
  const lastPart = parts[parts.length - 1];
  
  // Convert camelCase/snake_case to Title Case
  const words = lastPart
    .replace(/([A-Z])/g, ' $1') // Add space before capitals
    .replace(/_/g, ' ') // Replace underscores
    .split(' ')
    .filter(w => w.length > 0)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  
  return words.join(' ');
}

// Generate Arabic translation (placeholder that makes sense)
function generateArabicTranslation(englishText) {
  // Common translations
  const commonTranslations = {
    'Error': 'خطأ',
    'Success': 'نجح',
    'Failed': 'فشل',
    'Loading': 'جار التحميل',
    'Save': 'حفظ',
    'Cancel': 'إلغاء',
    'Delete': 'حذف',
    'Edit': 'تحرير',
    'Create': 'إنشاء',
    'Update': 'تحديث',
    'View': 'عرض',
    'Search': 'بحث',
    'Filter': 'تصفية',
    'All': 'الكل',
    'None': 'لا شيء',
    'Yes': 'نعم',
    'No': 'لا',
    'Required': 'مطلوب',
    'Optional': 'اختياري',
    'Title': 'العنوان',
    'Description': 'الوصف',
    'Name': 'الاسم',
    'Email': 'البريد الإلكتروني',
    'Password': 'كلمة المرور',
    'Phone': 'الهاتف',
    'Address': 'العنوان',
    'Date': 'التاريخ',
    'Time': 'الوقت',
    'Status': 'الحالة',
    'Type': 'النوع',
    'Category': 'الفئة',
    'Price': 'السعر',
    'Amount': 'المبلغ',
    'Total': 'الإجمالي',
    'Subtotal': 'المجموع الفرعي',
    'Currency': 'العملة',
    'Language': 'اللغة',
  };

  // Try exact match first
  if (commonTranslations[englishText]) {
    return commonTranslations[englishText];
  }

  // Try word-by-word translation for common words
  const words = englishText.split(' ');
  const translatedWords = words.map(word => commonTranslations[word] || word);
  
  // If any translations were found, use them
  if (translatedWords.some((w, i) => w !== words[i])) {
    return translatedWords.join(' ');
  }

  // Fallback: Return English text with Arabic prefix indicating it needs translation
  return `[AR] ${englishText}`;
}

// Process each domain
let totalAdded = 0;
for (const [domain, keys] of Object.entries(keysByDomain)) {
  const sourceFile = path.join(ROOT, 'i18n', 'sources', `${domain}.translations.json`);
  
  try {
    // Read existing file
    let content;
    try {
      const fileContent = await fs.readFile(sourceFile, 'utf-8');
      content = JSON.parse(fileContent);
    } catch (_err) {
      // File doesn't exist, create new structure
      console.log(`📝 Creating new file: ${domain}.translations.json`);
      content = { en: {}, ar: {} };
    }

    // Ensure en and ar objects exist
    if (!content.en) content.en = {};
    if (!content.ar) content.ar = {};

    // Add missing keys
    let added = 0;
    for (const { key, files } of keys) {
      if (!content.en[key]) {
        const englishText = generateEnglishTranslation(key);
        const arabicText = generateArabicTranslation(englishText);
        
        content.en[key] = englishText;
        content.ar[key] = arabicText;
        added++;
        
        console.log(`  ✅ Added: ${key}`);
        console.log(`     EN: "${englishText}"`);
        console.log(`     AR: "${arabicText}"`);
        if (files.length > 0) {
          console.log(`     Used in: ${files[0]}`);
        }
      }
    }

    if (added > 0) {
      // Sort keys alphabetically
      const sortedEn = Object.keys(content.en).sort().reduce((obj, key) => {
        obj[key] = content.en[key];
        return obj;
      }, {});
      
      const sortedAr = Object.keys(content.ar).sort().reduce((obj, key) => {
        obj[key] = content.ar[key];
        return obj;
      }, {});

      content.en = sortedEn;
      content.ar = sortedAr;

      // Write back to file
      await fs.writeFile(
        sourceFile,
        JSON.stringify(content, null, 2) + '\n',
        'utf-8'
      );
      
      console.log(`\n💾 Saved ${added} keys to ${domain}.translations.json`);
      totalAdded += added;
    } else {
      console.log(`\n✓ No missing keys in ${domain}.translations.json`);
    }
  } catch (_err) {
    console.error(`\n❌ Error processing ${domain}:`, _err.message);
  }
}

console.log(`\n✨ Total keys added: ${totalAdded}`);
console.log(`\n🔄 Now run: pnpm run build:i18n`);
console.log(`Then run: node scripts/audit-translations.mjs`);
