/**
 * Runtime translation loader - loads from generated JSON artifacts
 * Supports 2 languages: EN (English), AR (Arabic)
 * 
 * FR/PT/RU/ES/UR/HI/ZH removed - only EN/AR have real translations
 * Other locales can be added when translation budget is approved
 * 
 * CRITICAL: Run `pnpm i18n:build` before starting the app
 */

import type { TranslationBundle } from '@/i18n/dictionaries/types';
import type { LanguageCode } from '@/config/language-options';

// Supported locales (only those with real translations)
const SUPPORTED_LOCALES: LanguageCode[] = ['en', 'ar'];

let cachedTranslations: Record<LanguageCode, Record<string, string>> | null = null;

/**
 * Load translations from generated JSON artifacts (server-side only)
 * All artifacts MUST be pre-flattened during build (no runtime flattening)
 */
export function loadTranslations(): Record<LanguageCode, Record<string, string>> {
  if (cachedTranslations) {
    return cachedTranslations;
  }

  // Server-side: Load from generated JSON files
  if (typeof window === 'undefined') {
    try {
      const fs = require('fs');
      const path = require('path');
      const root = process.cwd();
      const genDir = path.join(root, 'i18n', 'generated');
      
      // Verify generated directory exists
      if (!fs.existsSync(genDir)) {
        throw new Error(
          `❌ i18n/generated/ not found. Run: pnpm i18n:build\n` +
          `   Current working directory: ${root}`
        );
      }
      
      const loaded: Partial<Record<LanguageCode, Record<string, string>>> = {};
      const missing: string[] = [];
      
      // Load all locale artifacts
      for (const locale of SUPPORTED_LOCALES) {
        const filePath = path.join(genDir, `${locale}.dictionary.json`);
        
        if (!fs.existsSync(filePath)) {
          missing.push(locale);
          loaded[locale] = {}; // Fallback to empty for missing locales
          continue;
        }
        
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const dict = JSON.parse(content);
          
          // Dictionaries are pre-flattened at build time (no runtime processing needed)
          loaded[locale] = dict;
        } catch (err) {
          console.error(`❌ Failed to parse ${locale} dictionary:`, err);
          loaded[locale] = {}; // Fallback on parse error
        }
      }
      
      if (missing.length > 0) {
        console.warn(
          `⚠️  Missing translation artifacts for: ${missing.join(', ')}\n` +
          `   Generate all locales with: pnpm i18n:build\n` +
          `   Falling back to empty dictionaries for missing locales`
        );
      }
      
      cachedTranslations = loaded as Record<LanguageCode, Record<string, string>>;
      return cachedTranslations;
      
    } catch (err) {
      console.error('❌ Failed to load translations:', err);
      throw err; // Don't silently fail - app needs translations
    }
  }

  // Client-side: Should be provided via props/context from SSR
  throw new Error(
    'Translation loader called on client-side. ' +
    'Translations must be embedded during SSR/SSG.'
  );
}

/**
 * @deprecated No longer needed - dictionaries are pre-flattened at build time
 * Flatten nested dictionary to dot-notation keys
 */
function flattenDictionary(obj: any, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string') {
      result[newKey] = value;
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenDictionary(value, newKey));
    }
  }
  
  return result;
}

/**
 * Get specific locale translations
 */
export function getTranslations(locale: LanguageCode): Record<string, string> {
  const all = loadTranslations();
  return all[locale] || {};
}

/**
 * Get available locale codes
 */
export function getAvailableLocales(): LanguageCode[] {
  return SUPPORTED_LOCALES;
}

/**
 * Get translation counts per locale (for validation)
 */
export function getTranslationCounts(): Record<LanguageCode, number> {
  const all = loadTranslations();
  const counts: Partial<Record<LanguageCode, number>> = {};
  
  for (const locale of SUPPORTED_LOCALES) {
    counts[locale] = Object.keys(all[locale] || {}).length;
  }
  
  return counts as Record<LanguageCode, number>;
}

/**
 * Check if translations are loaded
 */
export function areTranslationsLoaded(): boolean {
  return cachedTranslations !== null;
}

/**
 * Clear cache (useful for testing)
 */
export function clearTranslationCache(): void {
  cachedTranslations = null;
}
