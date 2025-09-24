'use client';

import type { ReactNode } from 'react';
import { I18nProvider } from '@/src/i18n/I18nProvider';
import { useI18n } from '@/src/i18n/useI18n';
import { DEFAULT_LOCALE, type Locale } from '@/src/i18n/config';

export type Language = Locale;

export interface TranslationContextType {
  language: Language;
  locale: string;
  setLanguage: (lang: Language) => void;
  setLocale: (locale: string) => void;
  t: (key: string, fallback?: string) => string;
  isRTL: boolean;
}

export function TranslationProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  return <I18nProvider initialLocale={initialLocale ?? DEFAULT_LOCALE}>{children}</I18nProvider>;
}

export function useTranslation(): TranslationContextType {
  const { locale, dir, t: translate, setLocale } = useI18n();

  const setLanguage = (lang: Language) => setLocale(lang);

  const setLocaleFromString = (value: string) => {
    const normalized = value.toLowerCase().startsWith('ar') ? 'ar' : 'en';
    setLocale(normalized as Locale);
  };

  const t = (key: string, fallback?: string) => {
    const result = translate(key);
    if (result === key && fallback) {
      return fallback;
    }
    return result;
  };

  return {
    language: locale,
    locale: locale === 'ar' ? 'ar-SA' : 'en-GB',
    setLanguage,
    setLocale: setLocaleFromString,
    t,
    isRTL: dir === 'rtl',
  };
}
