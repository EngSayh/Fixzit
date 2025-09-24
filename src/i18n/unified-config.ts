// src/i18n/unified-config.ts - Unified i18n configuration
export type Lang = 'en' | 'ar';

export interface LanguageConfig {
  code: Lang;
  iso: 'EN' | 'AR';
  nativeName: string;
  countryName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

// STRICT v4 compliant language configuration
export const LANGUAGES: LanguageConfig[] = [
  {
    code: 'en',
    iso: 'EN',
    nativeName: 'English',
    countryName: 'United Kingdom',
    flag: '/flags/uk.svg',
    dir: 'ltr',
  },
  {
    code: 'ar',
    iso: 'AR',
    nativeName: 'العربية',
    countryName: 'المملكة العربية السعودية',
    flag: '/flags/sa.svg',
    dir: 'rtl',
  },
];

export const DEFAULT_LANG: Lang = 'en';
export const COOKIE_NAME = 'fxz_lang';
export const DIR_COOKIE_NAME = 'fxz_dir';

export function isRTL(lang: Lang): boolean {
  return lang === 'ar';
}

export function getLanguageConfig(lang: Lang): LanguageConfig {
  return LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
}

// Helper to get translated text with nested path support
export function getTranslation(dict: any, path: string, fallback?: string): string {
  const keys = path.split('.');
  let result = dict;
  
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return fallback || path;
    }
  }
  
  return typeof result === 'string' ? result : fallback || path;
}

// Helper for interpolation
export function interpolate(text: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (str, [key, value]) => str.replace(new RegExp(`{${key}}`, 'g'), String(value)),
    text
  );
}
