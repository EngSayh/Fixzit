import { useContext, useCallback } from "react";
import { I18nContext } from "./I18nProvider";

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

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within <I18nProvider />");
  }

  // FIX: Use useCallback to memoize translation function based on dict reference
  // This ensures 't' has a stable identity when dict doesn't change,
  // but updates when dict changes
  const { dict } = ctx;
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw = drill(key, dict) ?? key;
      if (typeof raw !== "string") {
        return key;
      }

      if (!vars) {
        return raw;
      }

      return Object.keys(vars).reduce((acc, token) => {
        return acc.replace(new RegExp(`{${token}}`, "g"), String(vars[token]));
      }, raw);
    },
    [dict], // Recreate function when dict reference changes
  );

  return { ...ctx, t };
}

export type UseI18nReturn = ReturnType<typeof useI18n>;
