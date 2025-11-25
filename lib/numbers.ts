/**
 * Numeric utility helpers shared between finance/FM modules.
 * Provides safe parsing that preserves legitimate zero values while
 * filtering out NaN/undefined inputs.
 */
export function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized.length === 0) {
      return fallback;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

/**
 * Helper specifically for <input type="number" /> values which can be
 * string, number, empty string, or undefined.
 */
export function fromInputValue(
  value: string | number | null | undefined,
  fallback = 0,
): number {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  return toFiniteNumber(value, fallback);
}
