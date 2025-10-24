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

/**
 * Validation result type
 */
export type ValidationResult = { valid: true } | { valid: false; error: string };

/**
 * Validates positive number field
 * @param value Value to validate
 * @param fieldName Field name for error message
 * @returns Validation result
 */
export function validatePositiveNumber(value: unknown, fieldName: string): ValidationResult {
  if (typeof value !== 'number' || value <= 0) {
    return { valid: false, error: `${fieldName} must be a positive number` };
  }
  return { valid: true };
}

/**
 * Validates non-negative integer field
 * @param value Value to validate
 * @param fieldName Field name for error message
 * @returns Validation result
 */
export function validateNonNegativeInteger(value: unknown, fieldName: string): ValidationResult {
  if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
    return { valid: false, error: `${fieldName} must be a non-negative integer` };
  }
  return { valid: true };
}

/**
 * Validates non-negative number field
 * @param value Value to validate
 * @param fieldName Field name for error message
 * @returns Validation result
 */
export function validateNonNegativeNumber(value: unknown, fieldName: string): ValidationResult {
  if (typeof value !== 'number' || value < 0) {
    return { valid: false, error: `${fieldName} must be non-negative` };
  }
  return { valid: true };
}

/**
 * Validates non-empty string field
 * @param value Value to validate
 * @param fieldName Field name for error message
 * @returns Validation result
 */
export function validateNonEmptyString(value: unknown, fieldName: string): ValidationResult {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { valid: false, error: `${fieldName} must be a non-empty string` };
  }
  return { valid: true };
}
