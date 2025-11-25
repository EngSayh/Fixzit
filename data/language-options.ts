export type LanguageOption = {
  language: string;
  label: string;
  code: string;
  flag: string;
  dir: "ltr" | "rtl";
  // Additional properties expected by components
  locale: string;
  iso: string;
  native: string;
  english: string;
  country: string;
};

export type LanguageCode = "en" | "ar";

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    language: "en",
    label: "English",
    code: "en",
    flag: "🇺🇸",
    dir: "ltr",
    locale: "en",
    iso: "EN",
    native: "English",
    english: "English",
    country: "United States",
  },
  {
    language: "ar",
    label: "العربية",
    code: "ar",
    flag: "🇸🇦",
    dir: "rtl",
    locale: "ar",
    iso: "AR",
    native: "العربية",
    english: "Arabic",
    country: "Saudi Arabia",
  },
];

export const DEFAULT_LANGUAGE = LANGUAGE_OPTIONS[0];

// Helper functions for finding languages
export const findLanguageByCode = (
  code: string,
): LanguageOption | undefined => {
  return LANGUAGE_OPTIONS.find((lang) => lang.code === code);
};

export const findLanguageByLocale = (
  locale: string,
): LanguageOption | undefined => {
  return LANGUAGE_OPTIONS.find((lang) => lang.language === locale);
};
