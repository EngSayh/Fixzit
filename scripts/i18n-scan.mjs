#!/usr/bin/env node
/**
 * i18n Parity Audit Script
 * 
 * Scans locale files and source code to detect:
 * - Keys only in English (missing Arabic translations)
 * - Keys only in Arabic (missing English translations)
 * - Keys used in code but missing from both locales
 * 
 * Output: reports/i18n-missing.json
 * 
 * Usage:
 *   node scripts/i18n-scan.mjs
 *   pnpm run scan:i18n
 */

import fs from 'fs';
import path from 'path';
import { globby } from 'globby';

const ROOT_DIR = process.cwd();
const REPORTS_DIR = path.join(ROOT_DIR, 'reports');
const I18N_DIR = path.join(ROOT_DIR, 'i18n');

// Locale file paths
const EN_LOCALE = path.join(I18N_DIR, 'en.json');
const AR_LOCALE = path.join(I18N_DIR, 'ar.json');

async function main() {
  console.log('🔍 Starting i18n parity audit...');

  // Ensure reports directory exists
  await fs.promises.mkdir(REPORTS_DIR, { recursive: true });

  // Load locale files
  const enKeys = await loadLocaleKeys(EN_LOCALE);
  const arKeys = await loadLocaleKeys(AR_LOCALE);

  // Find differences
  const missingInArabic = enKeys.filter(key => !arKeys.includes(key));
  const missingInEnglish = arKeys.filter(key => !enKeys.includes(key));

  // Scan source code for translation key usage
  const usedKeys = await scanCodeForKeys();

  // Find keys used in code but missing from locales
  const missingFromBoth = usedKeys.filter(
    key => !enKeys.includes(key) && !arKeys.includes(key)
  );

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalEnglishKeys: enKeys.length,
      totalArabicKeys: arKeys.length,
      missingInArabic: missingInArabic.length,
      missingInEnglish: missingInEnglish.length,
      usedInCode: usedKeys.length,
      missingFromBoth: missingFromBoth.length,
    },
    details: {
      missingInArabic,
      missingInEnglish,
      missingFromBoth,
    },
  };

  const reportPath = path.join(REPORTS_DIR, 'i18n-missing.json');
  await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log(`✅ i18n audit complete. Report saved to: ${reportPath}`);
  console.log(`   - English keys: ${enKeys.length}`);
  console.log(`   - Arabic keys: ${arKeys.length}`);
  console.log(`   - Missing in Arabic: ${missingInArabic.length}`);
  console.log(`   - Missing in English: ${missingInEnglish.length}`);
  console.log(`   - Used in code but missing: ${missingFromBoth.length}`);
}

async function loadLocaleKeys(filePath) {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const json = JSON.parse(content);
    return flattenKeys(json);
  } catch (error) {
    console.warn(`⚠️  Failed to load locale file: ${filePath}`, error?.message || '');
    return [];
  }
}

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

async function scanCodeForKeys() {
  const usedKeys = new Set();
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  const searchPaths = ['app/**/*', 'components/**/*', 'lib/**/*', 'utils/**/*'];

  try {
    const files = await globby(searchPaths, {
      cwd: ROOT_DIR,
      gitignore: true,
      onlyFiles: true,
    });

    // Regex patterns to find translation key usage
    // Common patterns: t('KEY'), t("KEY"), useTranslation('KEY'), i18n.t('KEY')
    const patterns = [
      /\bt\(['"]([A-Z_][A-Z0-9_.]*)['"]/gi,
      /useTranslation\(['"]([A-Z_][A-Z0-9_.]*)['"]/gi,
      /i18n\.t\(['"]([A-Z_][A-Z0-9_.]*)['"]/gi,
    ];

    for (const file of files) {
      if (!extensions.some(ext => file.endsWith(ext))) continue;

      const content = await fs.promises.readFile(
        path.join(ROOT_DIR, file),
        'utf-8'
      );

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          usedKeys.add(match[1]);
        }
      }
    }

    return Array.from(usedKeys);
  } catch (error) {
    console.error('Failed to scan code for translation keys:', error);
    return [];
  }
}

main().catch(err => {
  console.error('❌ i18n audit failed:', err);
  process.exit(1);
});
