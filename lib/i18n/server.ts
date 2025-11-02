import { cookies } from 'next/headers';
import { findLanguageByCode } from '@/config/language-options';

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
