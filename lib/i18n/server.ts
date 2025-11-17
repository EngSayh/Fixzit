import { cookies } from 'next/headers';
import { findLanguageByCode } from '@/data/language-options';
import { NextRequest } from 'next/server';
import enMessages from '@/i18n/dictionaries/en';
import arMessages from '@/i18n/dictionaries/ar';

// eslint-disable-next-line no-unused-vars
type TFn = (key: string, fallback?: string) => string;

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

    const t: TFn = (key: string, fallback: string = key) => {
      // Minimal server-side behavior: return the fallback so existing calls with
      // explicit fallback strings continue to render correctly server-side.
      return fallback;
    };

    return { t, isRTL } as { t: TFn; isRTL: boolean };
   
  } catch (_err) {
    return {
      t: (k: string, f: string = k) => f,
      isRTL: false,
    };
  }
}

type _Messages = typeof enMessages;

export async function getServerTranslation(request: NextRequest) {
  // Get locale from cookie or Accept-Language header
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const headerLocale = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0];
  const locale = cookieLocale || headerLocale || 'en';
  
  const messages = locale === 'ar' ? arMessages : enMessages;
  
  return function t(key: string): string {
    const keys = key.split('.');
    let value: unknown = messages;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    return typeof value === 'string' ? value : key;
  };
}
