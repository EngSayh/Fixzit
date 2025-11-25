/**
 * Utility functions for safe parsing with explicit radix and fallback handling
 */

export function parseIntSafe(
  value: string | null | undefined,
  fallback: number,
): number {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? fallback : parsed;
}

export function parseIntFromQuery(
  value: string | null,
  fallback: number,
): number {
  return parseIntSafe(value, fallback);
}

export function parseFloatSafe(
  value: string | null | undefined,
  fallback: number,
): number {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? fallback : parsed;
}
