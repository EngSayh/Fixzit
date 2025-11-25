/**
 * Validation utilities for API routes
 * @module lib/api/validation
 */

import mongoose from "mongoose";

/**
 * Validates MongoDB ObjectId format using Mongoose (handles both string and ObjectId types)
 * @param id Value to validate
 * @returns True if valid ObjectId
 */
export function isValidObjectIdSafe(id: unknown): boolean {
  return mongoose.Types.ObjectId.isValid(id as string);
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
export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

/**
 * Validates positive number field (with automatic coercion from strings)
 * @param value Value to validate
 * @param fieldName Field name for error message
 * @returns Validation result
 */
export function validatePositiveNumber(
  value: unknown,
  fieldName: string,
): ValidationResult {
  // Check for empty string before coercion to avoid Number('') === 0
  if (value === "" || value === null || value === undefined) {
    return { valid: false, error: `${fieldName} is required` };
  }

  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return { valid: false, error: `${fieldName} must be a positive number` };
  }
  return { valid: true };
}

/**
 * Validates non-negative integer field (with automatic coercion from strings)
 * @param value Value to validate
 * @param fieldName Field name for error message
 * @returns Validation result
 */
export function validateNonNegativeInteger(
  value: unknown,
  fieldName: string,
): ValidationResult {
  // Check for empty string before coercion to avoid Number('') === 0
  if (value === "" || value === null || value === undefined) {
    return { valid: false, error: `${fieldName} is required` };
  }

  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || !Number.isInteger(num)) {
    return {
      valid: false,
      error: `${fieldName} must be a non-negative integer`,
    };
  }
  return { valid: true };
}

/**
 * Validates non-negative number field (with automatic coercion from strings)
 * @param value Value to validate
 * @param fieldName Field name for error message
 * @returns Validation result
 */
export function validateNonNegativeNumber(
  value: unknown,
  fieldName: string,
): ValidationResult {
  // Check for empty string before coercion to avoid Number('') === 0
  if (value === "" || value === null || value === undefined) {
    return { valid: false, error: `${fieldName} is required` };
  }

  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
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
export function validateNonEmptyString(
  value: unknown,
  fieldName: string,
): ValidationResult {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { valid: false, error: `${fieldName} must be a non-empty string` };
  }
  return { valid: true };
}
