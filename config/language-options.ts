/**
 * Language Options Configuration
 * 
 * ✅ SINGLE SOURCE OF TRUTH for all language-related data
 * Used by: LanguageSelector, TranslationProvider, SignupPage, etc.
 */

export type LanguageCode = 'ar' | 'en' | 'fr' | 'pt' | 'ru' | 'es' | 'ur' | 'hi' | 'zh';

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
  {
    language: 'fr',
    code: 'fr',
    native: 'Français',
    english: 'French',
    flag: '🇫🇷',
    dir: 'ltr',
    iso: 'FR-FR',
    locale: 'fr-FR',
    country: 'France',
    keywords: ['french', 'france'],
  },
  {
    language: 'pt',
    code: 'pt',
    native: 'Português',
    english: 'Portuguese',
    flag: '🇵🇹',
    dir: 'ltr',
    iso: 'PT-PT',
    locale: 'pt-PT',
    country: 'Portugal',
    keywords: ['portuguese', 'brazil', 'portugal'],
  },
  {
    language: 'ru',
    code: 'ru',
    native: 'Русский',
    english: 'Russian',
    flag: '🇷🇺',
    dir: 'ltr',
    iso: 'RU-RU',
    locale: 'ru-RU',
    country: 'Russia',
    keywords: ['russian', 'russia'],
  },
  {
    language: 'es',
    code: 'es',
    native: 'Español',
    english: 'Spanish',
    flag: '🇪🇸',
    dir: 'ltr',
    iso: 'ES-ES',
    locale: 'es-ES',
    country: 'Spain',
    keywords: ['spanish', 'latam'],
  },
  {
    language: 'ur',
    code: 'ur',
    native: 'اردو',
    english: 'Urdu',
    flag: '🇵🇰',
    dir: 'rtl',
    iso: 'UR-PK',
    locale: 'ur-PK',
    country: 'Pakistan',
    keywords: ['urdu', 'pk'],
  },
  {
    language: 'hi',
    code: 'hi',
    native: 'हिन्दी',
    english: 'Hindi',
    flag: '🇮🇳',
    dir: 'ltr',
    iso: 'HI-IN',
    locale: 'hi-IN',
    country: 'India',
    keywords: ['hindi', 'india'],
  },
  {
    language: 'zh',
    code: 'zh',
    native: '中文',
    english: 'Chinese',
    flag: '🇨🇳',
    dir: 'ltr',
    iso: 'ZH-CN',
    locale: 'zh-CN',
    country: 'China',
    keywords: ['chinese', 'mandarin'],
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
