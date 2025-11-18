// @ts-nocheck
'use client';
import { logger } from '@/lib/logger';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// ✅ FIX: Import from centralized config
import {
  LANGUAGE_OPTIONS,
  findLanguageByCode,
  findLanguageByLocale,
  type LanguageCode,
  type LanguageOption
} from '@/config/language-options';
// ✅ FIX: Import centralized storage and cookie keys
import { STORAGE_KEYS, COOKIE_KEYS, APP_DEFAULTS } from '@/config/constants';
// ✅ MIGRATION: Load from JSON artifacts instead of 59k-line TS literal
import { loadTranslations } from '@/lib/i18n/translation-loader';

// Lazy-load translations on first use
let translationsCache: ReturnType<typeof loadTranslations> | null = null;
function getTranslations() {
  if (!translationsCache) {
    translationsCache = loadTranslations();
  }
  return translationsCache;
}

export type Language = LanguageCode;

/* eslint-disable no-unused-vars */
interface TranslationContextType {
  language: Language;
  locale: string;
  setLanguage: (lang: Language) => void;
  setLocale: (locale: string) => void;
  t: (key: string, fallback?: string) => string;
  isRTL: boolean;
}
/* eslint-enable no-unused-vars */

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// Translation data
type TranslationMap = Record<Language, Record<string, string>>;

function buildTranslationDictionary(): TranslationMap {
  const bundle = getTranslations() as Partial<TranslationMap>;
  return LANGUAGE_OPTIONS.reduce((acc, option) => {
    acc[option.language] = bundle[option.language] ?? {};
    return acc;
  }, {} as TranslationMap);
}

const translations = buildTranslationDictionary();


// ✅ FIX: Use centralized APP_DEFAULTS instead of hardcoded 'ar'
const DEFAULT_LANGUAGE_OPTION = LANGUAGE_OPTIONS.find(opt => opt.language === APP_DEFAULTS.language) || LANGUAGE_OPTIONS[0];

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [currentOption, setCurrentOption] = useState<LanguageOption>(DEFAULT_LANGUAGE_OPTION);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    if (typeof window === 'undefined') {
      return;
    }

    try {
      const storedLocale = window.localStorage.getItem(STORAGE_KEYS.locale);
      const storedLanguage = window.localStorage.getItem(STORAGE_KEYS.language) as Language | null;
      const nextOption =
        (storedLocale && findLanguageByLocale(storedLocale)) ||
        (storedLanguage && findLanguageByCode(storedLanguage)) ||
        DEFAULT_LANGUAGE_OPTION;

      setCurrentOption(nextOption);
    } catch (error) {
      logger.warn('Could not access localStorage for language preference', { error });
      setCurrentOption(DEFAULT_LANGUAGE_OPTION);
    }
  }, []);

  useEffect(() => {
    if (!isClient || typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEYS.locale, currentOption.locale);
      window.localStorage.setItem(STORAGE_KEYS.language, currentOption.language);
      const oneYear = 365 * 24 * 60 * 60; // seconds
      document.cookie = `${COOKIE_KEYS.language}=${currentOption.language}; path=/; SameSite=Lax; max-age=${oneYear}`;
      document.cookie = `${COOKIE_KEYS.locale}=${currentOption.locale}; path=/; SameSite=Lax; max-age=${oneYear}`;
      document.documentElement.lang = currentOption.locale.toLowerCase();
      document.documentElement.dir = currentOption.dir;
      document.documentElement.setAttribute('data-locale', currentOption.locale);
      if (document.body) {
        document.body.style.direction = currentOption.dir;
      }
      window.dispatchEvent(
        new CustomEvent('fixzit:language-change', {
          detail: {
            locale: currentOption.locale,
            language: currentOption.language,
            dir: currentOption.dir
          }
        })
      );
    } catch (error) {
      logger.warn('Could not update language settings', { error });
    }
  }, [currentOption, isClient]);

  const setLanguage = (lang: Language) => {
    const nextOption = findLanguageByCode(lang);
    if (nextOption) {
      setCurrentOption(nextOption);
    }
  };

  const setLocale = (locale: string) => {
    const nextOption = findLanguageByLocale(locale) ?? findLanguageByCode(currentOption.language);
    if (nextOption) {
      setCurrentOption(nextOption);
    }
  };

  const language = currentOption.language;
  const locale = currentOption.locale;
  const isRTL = currentOption.dir === 'rtl';

  const t = (key: string, fallback: string = key): string => {
    try {
      const langData = translations[language as LanguageCode];
      // First check current language, then fallback to English, then use fallback string
      const enData = translations.en;
      const result = langData?.[key] ?? enData?.[key] ?? fallback;
      return result;
    } catch (error) {
      logger.warn(`Translation error for key '${key}'`, { error });
      return fallback;
    }
  };

  return (
    <TranslationContext.Provider value={{ language: language as LanguageCode, locale, setLanguage, setLocale, t, isRTL }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  try {
    const context = useContext(TranslationContext);

    // If context is not available, provide a safe fallback
    if (!context) {
      // Create a fallback context object for SSR
      const fallbackContext: TranslationContextType = {
        language: APP_DEFAULTS.language,
        locale: APP_DEFAULTS.locale,
        setLanguage: (lang: Language) => {
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_KEYS.language, lang);
              window.location.reload();
            }
          } catch (error) {
            logger.warn('Could not save language preference', { error });
          }
        },
        setLocale: (locale: string) => {
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_KEYS.locale, locale);
              logger.warn('Locale preference saved. Please refresh the page for changes to take effect.');
            }
          } catch (error) {
            logger.warn('Could not save locale preference', { error });
          }
        },
        t: (key: string, fallback: string = key): string => {
          return fallback;
        },
        isRTL: true
      };
      return fallbackContext;
    }

    return context;
  } catch (error) {
    // Ultimate fallback in case of any error
    logger.warn('useTranslation error', { error });
    return {
      language: APP_DEFAULTS.language as Language,
      locale: APP_DEFAULTS.locale,
      setLanguage: (_lang: Language) => {},
      setLocale: () => {},
      t: (key: string, fallback: string = key): string => fallback,
      isRTL: true
    };
  }
}
