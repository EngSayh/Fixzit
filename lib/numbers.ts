/**
 * @module lib/numbers
 * @description Numeric utility helpers shared between finance/FM modules.
 *
 * Provides safe parsing that preserves legitimate zero values while
 * filtering out NaN/undefined inputs. Prevents common input validation bugs.
 *
 * @features
 * - Safe number parsing with fallback (toFiniteNumber)
 * - Input value normalization (fromInputValue)
 * - Zero preservation (legitimate 0 values not converted to fallback)
 * - Type-safe handling (number, string, null, undefined)
 * - Finance/FM module compatibility
 *
 * @usage
 * ```typescript
 * const amount = toFiniteNumber(input, 0);     // Safe parse with 0 fallback
 * const qty = fromInputValue(inputVal, 1);     // HTML input value handling
 * ```
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
