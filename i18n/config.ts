import {
  LANGUAGE_OPTIONS,
  getDefaultLanguage,
} from "@/config/language-options";

// Production languages: Arabic and English only
export type Locale = "en" | "ar";

// Keep a consistent order (en first, then ar) to match UI/test expectations.
export const SUPPORTED_LOCALES: Locale[] = ["en", "ar"];

/**
 * Type guard to validate if a string is a valid Locale
 */
function isValidLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

// SECURITY FIX: Validate DEFAULT_LOCALE from config
// Previously cast without validation - could cause runtime errors if config returns unexpected value
const rawDefaultLocale = getDefaultLanguage().language;
export const DEFAULT_LOCALE: Locale = isValidLocale(rawDefaultLocale) 
  ? rawDefaultLocale 
  : "en"; // Safe fallback to English if config is invalid

export const LOCALE_META: Record<
  Locale,
  {
    iso: string;
    nativeName: string;
    countryName: string;
    dir: "ltr" | "rtl";
    flag: string; // country code (lowercase) for flag icons
  }
> = LANGUAGE_OPTIONS.reduce(
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
