import {
  LANGUAGE_OPTIONS,
  getDefaultLanguage,
  type LanguageOption,
} from "@/config/language-options";

// Only expose languages that are not marked as comingSoon
const ENABLED_LANGUAGE_OPTIONS = LANGUAGE_OPTIONS.filter(
  (opt) => !opt.comingSoon,
) as LanguageOption[];

// Locale = only enabled languages (en, ar) - fr, es are comingSoon
// Note: This is explicitly typed since runtime filtering doesn't narrow TypeScript types
export type Locale = "en" | "ar";

export const SUPPORTED_LOCALES: Locale[] = ENABLED_LANGUAGE_OPTIONS.map(
  (opt) => opt.language as Locale,
);

export const DEFAULT_LOCALE: Locale = getDefaultLanguage()
  .language as Locale;

export const LOCALE_META: Record<
  Locale,
  {
    iso: string;
    nativeName: string;
    countryName: string;
    dir: "ltr" | "rtl";
    flag: string;
  }
> = ENABLED_LANGUAGE_OPTIONS.reduce(
  (acc, opt) => {
    acc[opt.language as Locale] = {
      iso: opt.iso,
      nativeName: opt.native,
      countryName: opt.country,
      dir: opt.dir,
      flag: opt.flag,
    };
    return acc;
  },
  {} as Record<
    Locale,
    {
      iso: string;
      nativeName: string;
      countryName: string;
      dir: "ltr" | "rtl";
      flag: string;
    }
  >,
);
