/**
 * Language Options Configuration
 * 
 * ✅ SINGLE SOURCE OF TRUTH for all language-related data
 * Used by: LanguageSelector, TranslationProvider, SignupPage, etc.
 */

// Only English/Arabic have production-ready translations. Additional locales can be
// reintroduced here once professional translations land.
export type LanguageCode = 'ar' | 'en';

export interface LanguageOption {
  language: LanguageCode;
  code: string;        // Same as language for backward compatibility
  native: string;      // Native name (العربية, English)
  english: string;     // English name (Arabic, English)
  flag: string;        // Emoji flag
  dir: 'ltr' | 'rtl';  // Text direction
  iso: string;         // ISO code (AR-SA, EN-GB)
  locale: string;      // Full locale (ar-SA, en-GB)
  country: string;     // Country name
  keywords?: string[]; // Additional search keywords for type-ahead
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    language: 'ar',
    code: 'ar',
    native: 'العربية',
    english: 'Arabic',
    flag: '🇸🇦',
    dir: 'rtl',
    iso: 'AR-SA',
    locale: 'ar-SA',
    country: 'Saudi Arabia',
    keywords: ['ksa', 'arabic'],
  },
  {
    language: 'en',
    code: 'en',
    native: 'English',
    english: 'English',
    flag: '🇬🇧',
    dir: 'ltr',
    iso: 'EN-GB',
    locale: 'en-GB',
    country: 'United Kingdom',
    keywords: ['english', 'uk', 'us'],
  },
];

/**
 * Find language by language code
 */
export function findLanguageByCode(code: string): LanguageOption | undefined {
  return LANGUAGE_OPTIONS.find(opt => opt.language === code || opt.code === code);
}

/**
 * Find language by locale string
 */
export function findLanguageByLocale(locale: string): LanguageOption | undefined {
  return LANGUAGE_OPTIONS.find(opt => opt.locale === locale);
}

/**
 * Get default language (Arabic for KSA-first)
 */
export function getDefaultLanguage(): LanguageOption {
  return LANGUAGE_OPTIONS.find(opt => opt.language === 'ar') || LANGUAGE_OPTIONS[0];
}
