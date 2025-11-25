export type Locale = "en" | "ar";

export const DEFAULT_LOCALE: Locale = "ar";
export const SUPPORTED_LOCALES: Locale[] = ["en", "ar"];

export const LOCALE_META: Record<
  Locale,
  {
    iso: string;
    nativeName: string;
    countryName: string;
    dir: "ltr" | "rtl";
    flag: "gb" | "sa";
  }
> = {
  en: {
    iso: "EN",
    nativeName: "English",
    countryName: "United Kingdom",
    dir: "ltr",
    flag: "gb",
  },
  ar: {
    iso: "AR",
    nativeName: "العربية",
    countryName: "المملكة العربية السعودية",
    dir: "rtl",
    flag: "sa",
  },
};
