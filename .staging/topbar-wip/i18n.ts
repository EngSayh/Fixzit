/**
 * Internationalization utilities for TopBar
 */

import type { LangCode, Dir } from '@/types/topbar';

export const LANGUAGES: Array<{ code: LangCode; name: string; nativeName: string; flag: string; dir: Dir }> = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
];

/**
 * Get text direction from language code
 */
export function toDir(lang: LangCode): Dir {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

/**
 * Get language metadata
 */
export function getLanguage(code: LangCode) {
  return LANGUAGES.find(lang => lang.code === code) || LANGUAGES[0];
}
