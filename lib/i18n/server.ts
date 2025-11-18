import { cookies } from 'next/headers';
import { findLanguageByCode } from '@/data/language-options';
import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { SupportedTranslationLocale, TranslationDictionary } from '@/i18n/dictionaries/types';

type TranslationValues = Record<string, string | number>;

type TFn = (key: string, fallback?: string, values?: TranslationValues) => string;

const interpolate = (text: string, values?: TranslationValues) => {
  if (!values) return text;
  return text.replace(/{{\s*(\w+)\s*}}/g, (_, token) => {
    const value = values[token.trim()];
    return value === undefined ? '' : String(value);
  });
};

/**
 * Minimal server-side i18n helper.
 * - Reads language cookie written by client code (fxz.lang / fxz.locale)
 * - Exposes `t` which returns the provided fallback (avoids pulling the full translations into server)
 * - Exposes `isRTL` for layout direction decisions
 *
 * This keeps the AboutPage server-renderable without a full i18n refactor.
 */
export async function getServerI18n() {
  try {
    const ck = await cookies();
    const lang = ck.get('fxz.lang')?.value || ck.get('fxz.locale')?.value || undefined;

    // lang may be like 'ar' or locale like 'ar-SA'
    let langCode = undefined as string | undefined;
    if (lang) {
      // try to extract language code (xx from xx-YY)
      langCode = lang.split('-')[0];
    }

    const langOption = langCode ? findLanguageByCode(langCode) : undefined;
    const isRTL = !!langOption && langOption.dir === 'rtl';

    const t: TFn = (key: string, fallback: string = key, values?: TranslationValues) => {
      // Minimal server-side behavior: return the fallback so existing calls with
      // explicit fallback strings continue to render correctly server-side.
      return interpolate(fallback, values);
    };

    return { t, isRTL } as { t: TFn; isRTL: boolean };
   
  } catch (_err) {
    return {
      t: (k: string, f: string = k, values?: TranslationValues) => interpolate(f, values),
      isRTL: false,
    } as { t: TFn; isRTL: boolean };
  }
}

const GENERATED_DICTIONARY_DIR = path.join(process.cwd(), 'i18n', 'generated');
const DICTIONARY_CACHE: Partial<Record<SupportedTranslationLocale, TranslationDictionary>> = {};

function loadDictionary(locale: SupportedTranslationLocale): TranslationDictionary {
  if (DICTIONARY_CACHE[locale]) {
    return DICTIONARY_CACHE[locale] as TranslationDictionary;
  }

  const filePath = path.join(GENERATED_DICTIONARY_DIR, `${locale}.dictionary.json`);

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as TranslationDictionary;
    DICTIONARY_CACHE[locale] = parsed;
    return parsed;
  } catch (err) {
    console.error(`[i18n] Failed to load dictionary ${locale}:`, err);
    if (locale !== 'en') {
      return loadDictionary('en');
    }
    throw err;
  }
}

export async function getServerTranslation(request: NextRequest) {
  // Get locale from cookie or Accept-Language header
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const headerLocale = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0];
  const locale = cookieLocale || headerLocale || 'en';
  
  const chosenLocale: SupportedTranslationLocale = locale === 'ar' ? 'ar' : 'en';
  const messages = loadDictionary(chosenLocale);
  
  return function t(key: string, fallback?: string, values?: TranslationValues): string {
    const keys = key.split('.');
    let value: unknown = messages;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return interpolate(fallback ?? key, values);
      }
    }
    
    if (typeof value === 'string') {
      return interpolate(value, values);
    }
    return interpolate(fallback ?? key, values);
  };
}
