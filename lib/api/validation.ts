/**
 * Validation utilities for API routes
 * @module lib/api/validation
 */

/**
 * Validates MongoDB ObjectId format (24 hex chars)
 * @param id String to validate
 * @returns True if valid ObjectId format
 */
export function isValidObjectIdSafe(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}

/**
 * Clamps and validates integer within range
 * @param n Value to clamp
 * @param min Minimum value (default 1)
 * @param max Maximum value (default 100)
 * @returns Clamped integer or min if invalid
 */
export function clampPositiveInt(n: unknown, min = 1, max = 100): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.min(Math.max(Math.floor(v), min), max);
}
