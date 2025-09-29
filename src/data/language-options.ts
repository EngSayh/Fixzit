export type LanguageOption = {
  language: string;
  label: string;
  code: string;
  flag: string;
  dir: 'ltr' | 'rtl';
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    language: 'en',
    label: 'English',
    code: 'en',
    flag: '🇺🇸',
    dir: 'ltr'
  },
  {
    language: 'ar',
    label: 'العربية',
    code: 'ar',
    flag: '🇸🇦',
    dir: 'rtl'
  }
];

export const DEFAULT_LANGUAGE = LANGUAGE_OPTIONS[0];