export type DateInput = Date | number | string | null | undefined;

function normalizeDate(value: DateInput): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/**
 * Safely parse any supported date input.
 * Falls back to the provided fallback value (or current date) when the
 * input is missing/invalid to avoid runtime `Invalid Date` issues.
 */
export function parseDate(
  value: DateInput,
  fallback: Date | (() => Date) = () => new Date()
): Date {
  const resolved = normalizeDate(value);
  if (resolved) {
    return resolved;
  }

  const fallbackValue = typeof fallback === 'function' ? (fallback as () => Date)() : fallback;
  const normalizedFallback = normalizeDate(fallbackValue);
  return normalizedFallback ?? new Date();
}
