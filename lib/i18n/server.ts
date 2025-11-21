import { cookies, headers } from 'next/headers';
import { findLanguageByCode } from '@/data/language-options';
import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { SupportedTranslationLocale, TranslationDictionary } from '@/i18n/dictionaries/types';
import { logger } from '@/lib/logger';

type TranslationValues = Record<string, string | number>;

type TFn = (_key: string, _fallback?: string, _values?: TranslationValues) => string;

const interpolate = (text: string, values?: TranslationValues) => {
  if (!values) return text;
  return text.replace(/{{\s*(\w+)\s*}}/g, (_, token) => {
    const value = values[token.trim()];
    return value === undefined ? '' : String(value);
  });
};

const RTL_LANGUAGES: SupportedTranslationLocale[] = ['ar'];

const SUPPORTED_LOCALES: SupportedTranslationLocale[] = ['en', 'ar'];

const NORMALIZE_MAP: Record<string, SupportedTranslationLocale> = {
  ar: 'ar',
  'ar-sa': 'ar',
  'ar-sa-': 'ar',
  en: 'en',
  'en-gb': 'en',
  'en-us': 'en',
};

export type ServerI18nResult = {
  t: TFn;
  isRTL: boolean;
  locale: SupportedTranslationLocale;
};

/**
 * Minimal server-side i18n helper.
 * - Reads language cookie written by client code (fxz.lang / fxz.locale)
 * - Exposes `t` backed by generated dictionaries (avoids bundling the giant context)
 * - Provides RTL + locale metadata so layouts can set <html lang/dir> on first paint
 */
export async function getServerI18n(): Promise<ServerI18nResult> {
  try {
    const cookieStore = await cookies();
    const headerStore = await headers();

    const cookieLocale =
      cookieStore.get('fxz.lang')?.value ||
      cookieStore.get('fxz.locale')?.value ||
      cookieStore.get('locale')?.value;

    const headerLocale = headerStore.get('accept-language')?.split(',')[0];

    const locale = resolveLocale(cookieLocale || headerLocale);
    const langOption = findLanguageByCode(locale) || findLanguageByCode(locale.split('-')[0]);
    const messages = loadDictionary(locale);
    const translator = createTranslator(messages);

    return {
      t: translator,
      isRTL: langOption ? langOption.dir === 'rtl' : RTL_LANGUAGES.includes(locale),
      locale,
    };
  } catch (_err) {
    return {
      t: (k: string, f: string = k, values?: TranslationValues) => interpolate(f, values),
      isRTL: false,
      locale: 'en',
    };
  }
}

const GENERATED_DICTIONARY_DIR = path.join(process.cwd(), 'i18n', 'generated');
const DICTIONARY_CACHE: Partial<Record<SupportedTranslationLocale, TranslationDictionary>> = {};

function normalizeLocaleToken(input?: string | null): SupportedTranslationLocale | undefined {
  if (!input) {
    return undefined;
  }

  const token = input.trim().toLowerCase();
  if (NORMALIZE_MAP[token]) {
    return NORMALIZE_MAP[token];
  }

  const [language] = token.split(/[-_]/);
  if (language && (SUPPORTED_LOCALES as string[]).includes(language)) {
    return language as SupportedTranslationLocale;
  }
  return undefined;
}

function resolveLocale(preferred?: string | null): SupportedTranslationLocale {
  return normalizeLocaleToken(preferred) ?? 'en';
}

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
    if (process.env.NODE_ENV !== 'production') {
      logger.error('Failed to load dictionary', err, { component: 'i18n', locale });
    }
    if (locale !== 'en') {
      return loadDictionary('en');
    }
    throw err;
  }
}

function getMessageValue(dictionary: TranslationDictionary, key: string): string | undefined {
  if (key in dictionary && typeof dictionary[key] === 'string') {
    return dictionary[key] as string;
  }

  const segments = key.split('.');
  let current: unknown = dictionary;

  for (const segment of segments) {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

function createTranslator(dictionary: TranslationDictionary): TFn {
  return (key: string, fallback: string = key, values?: TranslationValues) => {
    const template = getMessageValue(dictionary, key) ?? fallback ?? key;
    return interpolate(template, values);
  };
}

export async function getServerTranslation(request: NextRequest) {
  // Get locale from cookie or Accept-Language header (match getServerI18n cookie keys)
  const cookieLocale =
    request.cookies.get('fxz.lang')?.value ||
    request.cookies.get('fxz.locale')?.value ||
    request.cookies.get('locale')?.value;
  const headerLocale = request.headers.get('accept-language')?.split(',')[0];
  const locale = resolveLocale(cookieLocale || headerLocale);

  const messages = loadDictionary(locale);
  return createTranslator(messages);
}
