'use client';
import { logger } from '@/lib/logger';
import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import {
  LANGUAGE_OPTIONS,
  findLanguageByCode,
  findLanguageByLocale,
  type LanguageCode,
  type LanguageOption,
} from '@/config/language-options';
import { STORAGE_KEYS, APP_DEFAULTS } from '@/config/constants';
import { useI18n } from '@/i18n/useI18n';
import type { Locale } from '@/i18n/config';

export type Language = LanguageCode;

type TranslationValues = Record<string, string | number>;

const interpolatePlaceholders = (text: string, values?: TranslationValues) => {
  if (!values) return text;
  return text.replace(/{{\s*(\w+)\s*}}/g, (_match, token: string) => {
    const value = values[token.trim()];
    return value === undefined ? '' : String(value);
  });
};

interface TranslationContextType {
  language: Language;
  locale: string;
  setLanguage: (lang: Language) => void;
  setLocale: (locale: string) => void;
  t: (key: string, fallback?: string, values?: TranslationValues) => string;
  isRTL: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// ✅ FIX: Use centralized APP_DEFAULTS instead of hardcoded 'ar'
const DEFAULT_LANGUAGE_OPTION =
  LANGUAGE_OPTIONS.find((opt) => opt.language === APP_DEFAULTS.language) || LANGUAGE_OPTIONS[0];

function createFallbackContext(option: LanguageOption): TranslationContextType {
  return {
    language: option.language as Language,
    locale: option.locale,
    setLanguage: (lang: Language) => {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.language, lang);
          logger.warn('Language preference saved. Please refresh the page for changes to take effect.');
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
    t: (key: string, fallback: string = key, values?: TranslationValues) =>
      interpolatePlaceholders(fallback, values),
    isRTL: option.dir === 'rtl',
  };
}

type TranslationProviderProps = {
  children: ReactNode;
  initialLanguage?: LanguageCode;
};

export function TranslationProvider({ children, initialLanguage }: TranslationProviderProps) {
  const fallbackOption = useMemo(() => {
    if (initialLanguage) {
      return findLanguageByCode(initialLanguage) ?? DEFAULT_LANGUAGE_OPTION;
    }
    return DEFAULT_LANGUAGE_OPTION;
  }, [initialLanguage]);

  // ✅ FIX: Always call useI18n at top level (React Hooks rules) - no try-catch allowed
  const i18nHookResult = useI18n();

  const contextValue = useMemo(() => {
    // If i18n hook returns invalid data, use fallback
    if (!i18nHookResult || !i18nHookResult.locale) {
      logger.warn('i18n hook returned invalid data, using fallback');
      return createFallbackContext(fallbackOption);
    }

    const { locale: i18nLocale, dir, setLocale: i18nSetLocale, t: i18nTranslate } = i18nHookResult;
    const activeOption =
      findLanguageByLocale(i18nLocale) ?? findLanguageByCode(i18nLocale) ?? fallbackOption;

    const setLanguage = (lang: Language) => {
      const nextOption = findLanguageByCode(lang);
      if (nextOption) {
        i18nSetLocale(nextOption.language as Locale);
      }
    };

    const setLocale = (locale: string) => {
      const nextOption = findLanguageByLocale(locale) ?? findLanguageByCode(locale);
      if (nextOption) {
        i18nSetLocale(nextOption.language as Locale);
      } else {
        i18nSetLocale(activeOption.language as Locale);
      }
    };

    const translate = (key: string, fallback: string = key, values?: TranslationValues) => {
      try {
        const result = i18nTranslate(key, values as Record<string, string | number> | undefined);
        if (result === key && fallback) {
          return interpolatePlaceholders(fallback, values);
        }
        return result;
      } catch (error) {
        logger.warn(`Translation error for key '${key}'`, { error });
        return interpolatePlaceholders(fallback, values);
      }
    };

    return {
      language: activeOption.language,
      locale: activeOption.locale,
      setLanguage,
      setLocale,
      t: translate,
      isRTL: dir === 'rtl',
    };
  }, [i18nHookResult, fallbackOption]);

  return <TranslationContext.Provider value={contextValue}>{children}</TranslationContext.Provider>;
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
              logger.warn('Language preference saved. Please refresh the page for changes to take effect.');
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
        t: (key: string, fallback: string = key, values?: TranslationValues): string =>
          interpolatePlaceholders(fallback, values),
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
      t: (key: string, fallback: string = key, values?: TranslationValues): string =>
        interpolatePlaceholders(fallback, values),
      isRTL: true
    };
  }
}
