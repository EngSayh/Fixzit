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
// Note: This must be explicitly typed since runtime filtering doesn't narrow TypeScript types.
// When adding new enabled languages, update this type AND add dictionary imports in I18nProvider.tsx
export type Locale = "en" | "ar";

// Keep a consistent order (en first, then ar) to match UI/test expectations.
const LOCALE_DISPLAY_ORDER: Locale[] = ["en", "ar"];

export const SUPPORTED_LOCALES: Locale[] = LOCALE_DISPLAY_ORDER.filter((loc) =>
  ENABLED_LANGUAGE_OPTIONS.some((opt) => opt.language === loc),
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
    flag: string; // country code (lowercase) for flag icons
  }
> = ENABLED_LANGUAGE_OPTIONS.reduce(
  (acc, opt) => {
    const isoCode =
      (opt.iso?.split("-")[0] || opt.language || "").toUpperCase();
    const flagCode = (opt.iso?.split("-")[1] || opt.country || "")
      .toLowerCase()
      .replace(/[^a-z]/g, "");
    const countryName =
      opt.language === "ar" ? "المملكة العربية السعودية" : opt.country;

    acc[opt.language as Locale] = {
      iso: isoCode,
      nativeName: opt.native,
      countryName: countryName,
      dir: opt.dir,
      flag: flagCode,
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
