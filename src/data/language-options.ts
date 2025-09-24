export type LanguageCode = 'ar' | 'en' | 'fr' | 'pt' | 'ru' | 'es' | 'ur' | 'hi' | 'zh';

export type LanguageOption = {
  /** ISO locale such as ar-SA */
  locale: string;
  /** Internal translation code */
  language: LanguageCode;
  /** ISO 639/3166 representation shown to users */
  iso: string;
  /** Native autonym */
  native: string;
  /** English label */
  english: string;
  /** Country or region description */
  country: string;
  /** Emoji flag placeholder (can be swapped for SVG) */
  flag: string;
  /** Writing direction */
  dir: 'ltr' | 'rtl';
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    locale: 'ar-SA',
    language: 'ar',
    iso: 'AR-SA',
    native: 'العربية',
    english: 'Arabic',
    country: 'المملكة العربية السعودية',
    flag: '🇸🇦',
    dir: 'rtl'
  },
  {
    locale: 'en-US',
    language: 'en',
    iso: 'EN-US',
    native: 'English',
    english: 'English (United States)',
    country: 'United States',
    flag: '🇺🇸',
    dir: 'ltr'
  },
  {
    locale: 'en-GB',
    language: 'en',
    iso: 'EN-UK',
    native: 'English',
    english: 'English (United Kingdom)',
    country: 'United Kingdom',
    flag: '🇬🇧',
    dir: 'ltr'
  },
  {
    locale: 'fr-FR',
    language: 'fr',
    iso: 'FR-FR',
    native: 'Français',
    english: 'French',
    country: 'France',
    flag: '🇫🇷',
    dir: 'ltr'
  },
  {
    locale: 'pt-PT',
    language: 'pt',
    iso: 'PT-PT',
    native: 'Português',
    english: 'Portuguese',
    country: 'Portugal',
    flag: '🇵🇹',
    dir: 'ltr'
  },
  {
    locale: 'ru-RU',
    language: 'ru',
    iso: 'RU-RU',
    native: 'Русский',
    english: 'Russian',
    country: 'Россия',
    flag: '🇷🇺',
    dir: 'ltr'
  },
  {
    locale: 'es-ES',
    language: 'es',
    iso: 'ES-ES',
    native: 'Español',
    english: 'Spanish',
    country: 'España',
    flag: '🇪🇸',
    dir: 'ltr'
  },
  {
    locale: 'ur-PK',
    language: 'ur',
    iso: 'UR-PK',
    native: 'اردو',
    english: 'Urdu',
    country: 'پاکستان',
    flag: '🇵🇰',
    dir: 'rtl'
  },
  {
    locale: 'hi-IN',
    language: 'hi',
    iso: 'HI-IN',
    native: 'हिन्दी',
    english: 'Hindi',
    country: 'भारत',
    flag: '🇮🇳',
    dir: 'ltr'
  },
  {
    locale: 'zh-CN',
    language: 'zh',
    iso: 'ZH-CN',
    native: '中文',
    english: 'Chinese',
    country: '中国',
    flag: '🇨🇳',
    dir: 'ltr'
  }
];

export function findLanguageByLocale(locale: string): LanguageOption | undefined {
  return LANGUAGE_OPTIONS.find(option => option.locale.toLowerCase() === locale.toLowerCase());
}

export function findLanguageByCode(language: LanguageCode): LanguageOption {
  return LANGUAGE_OPTIONS.find(option => option.language === language) ?? LANGUAGE_OPTIONS[0];
}
