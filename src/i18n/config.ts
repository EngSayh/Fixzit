// src/i18n/config.ts
export type Lang = 'en' | 'ar';

export type LanguageItem = {
  code: Lang;
  iso: 'EN' | 'AR';
  nativeName: string;       // 'English', 'العربية'
  countryName: string;      // 'United Kingdom', 'المملكة العربية السعودية' (example)
  flag: string;             // public path to SVG
  dir: 'ltr' | 'rtl';
};

export const LANGUAGES: LanguageItem[] = [
  { code: 'en', iso: 'EN', nativeName: 'English', countryName: 'United Kingdom', flag: '/flags/en-GB.svg', dir: 'ltr' },
  { code: 'ar', iso: 'AR', nativeName: 'العربية', countryName: 'المملكة العربية السعودية', flag: '/flags/ar-SA.svg', dir: 'rtl' }
];

export const DEFAULT_LANG: Lang = 'en';
export const isRTL = (lang: Lang) => lang === 'ar';
