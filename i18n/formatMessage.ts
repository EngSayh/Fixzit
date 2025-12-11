import IntlMessageFormat from "intl-messageformat";

type MessageValue = string | number | boolean | Date | null | undefined;

type MessageVars = Record<string, MessageValue>;

const formatterCache = new Map<
  string,
  { raw: string; formatter: IntlMessageFormat }
>();

function getFormatter(
  cacheKey: string,
  raw: string,
  locale: string,
): IntlMessageFormat {
  const cached = formatterCache.get(cacheKey);
  if (cached && cached.raw === raw) {
    return cached.formatter;
  }

  const formatter = new IntlMessageFormat(raw, locale);
  formatterCache.set(cacheKey, { raw, formatter });
  return formatter;
}

export function formatIcuMessage(
  key: string,
  raw: string,
  locale: string,
  vars?: MessageVars,
): string {
  if (!vars || Object.keys(vars).length === 0) {
    return raw;
  }

  const cacheKey = `${locale}:${key}`;

  try {
    const formatter = getFormatter(cacheKey, raw, locale);
    return String(formatter.format(vars));
  } catch (_error) {
    const error = _error as Error;
    // Safety: fall back to simple replacement to avoid user-facing crashes
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console -- development-only guardrail
      console.warn(
        "[i18n] Failed to format ICU message; using fallback",
        error?.message,
      );
    }

    return Object.keys(vars).reduce((acc, token) => {
      return acc.replace(new RegExp(`{${token}}`, "g"), String(vars[token]));
    }, raw);
  }
}

export function clearMessageFormatCache(): void {
  formatterCache.clear();
}
