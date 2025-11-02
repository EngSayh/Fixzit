#!/usr/bin/env zx
// @ts-check

/**
 * i18n Parity Scan
 * Checks for missing translations between languages
 */

import 'zx/globals';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(ROOT, 'reports');

console.log(chalk.blue('🌍 Scanning i18n Parity...'));

async function scanI18n() {
  try {
    // Load i18n files
    const i18nDir = path.join(ROOT, 'i18n');
    const languages = ['en', 'ar'];
    const translations = {};

    for (const lang of languages) {
      const filePath = path.join(i18nDir, `${lang}.ts`);
      if (await fs.pathExists(filePath)) {
        const content = await fs.readFile(filePath, 'utf-8');
        // Extract keys (simplified - proper parser would be better)
        const keys = content.match(/['"]([^'"]+)['"]\s*:/g)?.map(k => k.replace(/['"]|:/g, '').trim()) || [];
        translations[lang] = new Set(keys);
      } else {
        console.log(chalk.yellow(`⚠️  Language file not found: ${lang}.ts`));
        translations[lang] = new Set();
      }
    }

    // Find missing keys
    const missing = {};
    for (const lang of languages) {
      missing[lang] = [];
      for (const otherLang of languages) {
        if (lang !== otherLang) {
          for (const key of translations[otherLang]) {
            if (!translations[lang].has(key)) {
              missing[lang].push({ key, presentIn: otherLang });
            }
          }
        }
      }
    }

    // Write report
    await fs.ensureDir(REPORTS_DIR);
    await fs.writeJSON(path.join(REPORTS_DIR, 'i18n-missing.json'), missing, { spaces: 2 });

    console.log(chalk.green(`✅ i18n scan complete`));
    for (const [lang, keys] of Object.entries(missing)) {
      console.log(chalk.gray(`   ${lang}: ${keys.length} missing keys`));
    }
  } catch (error) {
    console.error(chalk.red(`❌ i18n scan failed: ${error.message}`));
    throw error;
  }
}

scanI18n();
