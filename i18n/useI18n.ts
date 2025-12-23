import { useContext, useCallback } from "react";
import { I18nContext } from "./I18nProvider";
import { formatIcuMessage } from "./formatMessage";

type Dict = Record<string, unknown>;

const drill = (path: string, dict: Dict): unknown => {
  if (path in dict) {
    return (dict as Record<string, unknown>)[path];
  }

  return path.split(".").reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === "object" && segment in acc) {
      return (acc as Dict)[segment];
    }
    return undefined;
  }, dict);
};

type TranslationValues = Record<string, string | number | boolean | Date | null>;

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within <I18nProvider />");
  }
  const isRTL = ctx.dir === "rtl";

  // FIX: Use useCallback to memoize translation function based on dict reference
  // This ensures 't' has a stable identity when dict doesn't change,
  // but updates when dict changes
  const { dict, locale } = ctx;
  const t = useCallback(
    (key: string, varsOrFallback?: TranslationValues | string | null) => {
      const isFallbackString = typeof varsOrFallback === "string";
      const fallback = isFallbackString ? varsOrFallback : undefined;
      const vars =
        varsOrFallback && typeof varsOrFallback === "object" && !Array.isArray(varsOrFallback)
          ? (varsOrFallback as TranslationValues)
          : undefined;

      const raw = drill(key, dict) ?? fallback ?? key;
      if (typeof raw !== "string") {
        return fallback ?? key;
      }

      return formatIcuMessage(key, raw, locale, vars);
    },
    [dict, locale], // Recreate function when dict reference changes
  );

  return { ...ctx, t, isRTL };
}

export type UseI18nReturn = ReturnType<typeof useI18n>;
