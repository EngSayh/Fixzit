export type TranslationDictionary = {
  [key: string]: string | TranslationDictionary;
};

export type FlatTranslationMap = Record<string, string>;

export type SupportedTranslationLocale = "en" | "ar";

export type TranslationBundle = Record<
  SupportedTranslationLocale,
  FlatTranslationMap
>;
