#!/usr/bin/env tsx
/**
 * Find Missing Locale Translations
 * 
 * Identifies which keys in each locale are auto-filled placeholders
 * (copied from EN/AR) vs. actual translations.
 * 
 * Usage:
 *   npx tsx scripts/find-missing-locales.ts
 *   npx tsx scripts/find-missing-locales.ts --locale=fr
 *   npx tsx scripts/find-missing-locales.ts --show-samples
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const GENERATED_DIR = path.join(ROOT, 'i18n', 'generated');

const ALL_LOCALES = ['en', 'ar', 'fr', 'pt', 'ru', 'es', 'ur', 'hi', 'zh'] as const;
type Locale = typeof ALL_LOCALES[number];

interface LocaleStats {
  locale: Locale;
  totalKeys: number;
  uniqueTranslations: number;
  autoFilledFromEN: number;
  autoFilledFromAR: number;
  completeness: number;
}

/**
 * Load all locale dictionaries
 */
function loadDictionaries(): Record<Locale, Record<string, string>> {
  const result: Partial<Record<Locale, Record<string, string>>> = {};
  
  for (const locale of ALL_LOCALES) {
    const filePath = path.join(GENERATED_DIR, `${locale}.dictionary.json`);
    
    if (!existsSync(filePath)) {
      console.error(`❌ Missing: ${filePath}`);
      console.error(`   Run: pnpm i18n:build`);
      process.exit(1);
    }
    
    const content = readFileSync(filePath, 'utf-8');
    result[locale] = JSON.parse(content);
  }
  
  return result as Record<Locale, Record<string, string>>;
}

/**
 * Analyze translation completeness for each locale
 */
function analyzeLocales(dicts: Record<Locale, Record<string, string>>): LocaleStats[] {
  const stats: LocaleStats[] = [];
  
  for (const locale of ALL_LOCALES) {
    if (locale === 'en' || locale === 'ar') {
      // EN and AR are the source locales
      stats.push({
        locale,
        totalKeys: Object.keys(dicts[locale]).length,
        uniqueTranslations: Object.keys(dicts[locale]).length,
        autoFilledFromEN: 0,
        autoFilledFromAR: 0,
        completeness: 100
      });
      continue;
    }
    
    const localeDict = dicts[locale];
    const enDict = dicts.en;
    const arDict = dicts.ar;
    
    let autoFilledFromEN = 0;
    let autoFilledFromAR = 0;
    let uniqueTranslations = 0;
    
    for (const [key, value] of Object.entries(localeDict)) {
      const enValue = enDict[key];
      const arValue = arDict[key];
      
      // If value matches EN exactly, it's auto-filled from EN
      if (value === enValue) {
        autoFilledFromEN++;
      }
      // If value matches AR exactly (and not EN), it's auto-filled from AR
      else if (value === arValue) {
        autoFilledFromAR++;
      }
      // Otherwise it's a unique translation
      else {
        uniqueTranslations++;
      }
    }
    
    const totalKeys = Object.keys(localeDict).length;
    const completeness = (uniqueTranslations / totalKeys) * 100;
    
    stats.push({
      locale,
      totalKeys,
      uniqueTranslations,
      autoFilledFromEN,
      autoFilledFromAR,
      completeness
    });
  }
  
  return stats;
}

/**
 * Find sample auto-filled keys for a locale
 */
function findAutoFilledSamples(
  locale: Locale,
  dicts: Record<Locale, Record<string, string>>,
  limit = 10
): Array<{ key: string; value: string; source: 'en' | 'ar' }> {
  if (locale === 'en' || locale === 'ar') {
    return [];
  }
  
  const samples: Array<{ key: string; value: string; source: 'en' | 'ar' }> = [];
  const localeDict = dicts[locale];
  const enDict = dicts.en;
  const arDict = dicts.ar;
  
  for (const [key, value] of Object.entries(localeDict)) {
    if (samples.length >= limit) break;
    
    const enValue = enDict[key];
    const arValue = arDict[key];
    
    if (value === enValue && value !== arValue) {
      samples.push({ key, value, source: 'en' });
    } else if (value === arValue && value !== enValue) {
      samples.push({ key, value, source: 'ar' });
    }
  }
  
  return samples;
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const targetLocale = args.find(arg => arg.startsWith('--locale='))?.split('=')[1] as Locale | undefined;
  const showSamples = args.includes('--show-samples');
  
  console.log('🔍 Analyzing translation completeness...\n');
  
  const dicts = loadDictionaries();
  const stats = analyzeLocales(dicts);
  
  // Filter to target locale if specified
  const filteredStats = targetLocale
    ? stats.filter(s => s.locale === targetLocale)
    : stats;
  
  if (filteredStats.length === 0) {
    console.error(`❌ Locale "${targetLocale}" not found`);
    console.error(`   Available: ${ALL_LOCALES.join(', ')}`);
    process.exit(1);
  }
  
  // Print summary table
  console.log('📊 Translation Completeness Summary:\n');
  console.log('Locale | Total Keys | Unique | Auto-filled (EN) | Auto-filled (AR) | Completeness');
  console.log('-------|------------|--------|------------------|------------------|-------------');
  
  for (const stat of filteredStats) {
    const locale = stat.locale.padEnd(6);
    const total = String(stat.totalKeys).padStart(10);
    const unique = String(stat.uniqueTranslations).padStart(6);
    const autoEN = String(stat.autoFilledFromEN).padStart(16);
    const autoAR = String(stat.autoFilledFromAR).padStart(16);
    const completeness = `${stat.completeness.toFixed(1)}%`.padStart(12);
    
    console.log(`${locale} | ${total} | ${unique} | ${autoEN} | ${autoAR} | ${completeness}`);
  }
  
  // Calculate aggregate stats
  const targetLocales = filteredStats.filter(s => s.locale !== 'en' && s.locale !== 'ar');
  if (targetLocales.length > 0) {
    const totalKeys = targetLocales.reduce((sum, s) => sum + s.totalKeys, 0);
    const totalUnique = targetLocales.reduce((sum, s) => sum + s.uniqueTranslations, 0);
    const totalAutoEN = targetLocales.reduce((sum, s) => sum + s.autoFilledFromEN, 0);
    const totalAutoAR = targetLocales.reduce((sum, s) => sum + s.autoFilledFromAR, 0);
    const avgCompleteness = totalUnique / totalKeys * 100;
    
    console.log('\n📈 Aggregate (excluding EN/AR):');
    console.log(`   Total translation slots: ${totalKeys.toLocaleString()}`);
    console.log(`   Unique translations: ${totalUnique.toLocaleString()} (${avgCompleteness.toFixed(1)}%)`);
    console.log(`   Auto-filled from EN: ${totalAutoEN.toLocaleString()} (${(totalAutoEN/totalKeys*100).toFixed(1)}%)`);
    console.log(`   Auto-filled from AR: ${totalAutoAR.toLocaleString()} (${(totalAutoAR/totalKeys*100).toFixed(1)}%)`);
  }
  
  // Show samples if requested
  if (showSamples && targetLocale && targetLocale !== 'en' && targetLocale !== 'ar') {
    console.log(`\n🔍 Sample auto-filled keys for ${targetLocale.toUpperCase()}:\n`);
    const samples = findAutoFilledSamples(targetLocale, dicts, 20);
    
    if (samples.length === 0) {
      console.log('   ✅ No auto-filled keys found (all translations are unique)');
    } else {
      samples.forEach(({ key, value, source }) => {
        console.log(`   ${key.padEnd(50)} | "${value}" (from ${source})`);
      });
      
      const stat = stats.find(s => s.locale === targetLocale);
      if (stat && samples.length < stat.autoFilledFromEN + stat.autoFilledFromAR) {
        const remaining = stat.autoFilledFromEN + stat.autoFilledFromAR - samples.length;
        console.log(`\n   ... and ${remaining.toLocaleString()} more auto-filled keys`);
      }
    }
  }
  
  // Exit with error if completeness is below threshold
  const minCompleteness = 50; // Can be adjusted
  const failingLocales = targetLocales.filter(s => s.completeness < minCompleteness);
  
  if (failingLocales.length > 0) {
    console.log(`\n⚠️  Warning: ${failingLocales.length} locale(s) below ${minCompleteness}% completeness:`);
    failingLocales.forEach(s => {
      console.log(`   - ${s.locale}: ${s.completeness.toFixed(1)}% (${s.uniqueTranslations}/${s.totalKeys} translated)`);
    });
    console.log('\n💡 Run with --show-samples --locale=<code> to see which keys need translation');
    
    // Don't fail build by default (just warn)
    // Uncomment to make CI fail:
    // process.exit(1);
  } else {
    console.log('\n✅ All locales meet minimum completeness threshold');
  }
}

main();
