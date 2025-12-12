/**
 * Safe JSON parsing utilities
 *
 * Prevents crashes from malformed JSON in localStorage, API responses,
 * or file content. Use instead of raw JSON.parse().
 *
 * @module lib/utils/safe-json
 */

import { logger } from "@/lib/logger";

/**
 * Result type for safeJsonParse - discriminated union for type safety
 */
export type SafeJsonResult<T> =
  | { success: true; data: T; error: undefined }
  | { success: false; data: undefined; error: string };

/**
 * Safely parse JSON with comprehensive error handling.
 * Returns a discriminated union for type-safe error checking.
 *
 * @example
 * ```typescript
 * const result = safeJsonParse<User>(localStorage.getItem('user') ?? '');
 * if (result.success) {
 *   console.log(result.data.name);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function safeJsonParse<T = unknown>(
  text: string,
  options?: { silent?: boolean; context?: string }
): SafeJsonResult<T> {
  const { silent = false, context } = options ?? {};

  if (!text || typeof text !== "string") {
    return {
      success: false,
      data: undefined,
      error: "Input is empty or not a string",
    };
  }

  try {
    const data = JSON.parse(text) as T;
    return { success: true, data, error: undefined };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown parse error";

    if (!silent) {
      logger.warn("[safeJsonParse] Failed to parse JSON", {
        context,
        error: errorMessage,
        inputLength: text.length,
        inputPreview: text.slice(0, 100),
      });
    }

    return {
      success: false,
      data: undefined,
      error: errorMessage,
    };
  }
}

/**
 * Safely parse JSON with a fallback value.
 * Use when you need a default value on parse failure.
 *
 * @example
 * ```typescript
 * const user = safeJsonParseWithFallback<User>(
 *   localStorage.getItem('user') ?? '',
 *   { name: 'Guest', id: '' }
 * );
 * ```
 */
export function safeJsonParseWithFallback<T>(
  text: string,
  fallback: T,
  options?: { silent?: boolean; context?: string }
): T {
  const result = safeJsonParse<T>(text, options);
  return result.success ? result.data : fallback;
}

/**
 * Safely parse JSON from localStorage.
 * Handles both the localStorage.getItem() returning null and parse failures.
 *
 * @example
 * ```typescript
 * const settings = parseLocalStorage<Settings>('app-settings', defaultSettings);
 * ```
 */
export function parseLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;

    const result = safeJsonParse<T>(item, {
      context: `localStorage:${key}`,
      silent: true,
    });

    if (!result.success) {
      // Remove corrupted data
      localStorage.removeItem(key);
      logger.warn("[parseLocalStorage] Removed corrupted localStorage item", {
        key,
        error: result.error,
      });
      return fallback;
    }

    return result.data;
  } catch {
    // localStorage might be unavailable (e.g., private browsing)
    return fallback;
  }
}

/**
 * Safely stringify to JSON with error handling.
 * Handles circular references and BigInt values.
 *
 * @example
 * ```typescript
 * const json = safeJsonStringify(complexObject, '{}');
 * ```
 */
export function safeJsonStringify<T>(
  value: T,
  fallback: string = "null",
  options?: { space?: number; context?: string }
): string {
  const { space, context } = options ?? {};

  try {
    return JSON.stringify(value, (_key, val) => {
      // Handle BigInt
      if (typeof val === "bigint") {
        return val.toString();
      }
      return val;
    }, space);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown stringify error";

    logger.warn("[safeJsonStringify] Failed to stringify", {
      context,
      error: errorMessage,
      valueType: typeof value,
    });

    return fallback;
  }
}

/**
 * Type guard to check if parsed JSON matches expected shape.
 * Use with safeJsonParse for runtime type validation.
 *
 * @example
 * ```typescript
 * const result = safeJsonParse<User>(data);
 * if (result.success && isValidUser(result.data)) {
 *   // result.data is now typed as User
 * }
 * ```
 */
export function hasRequiredFields<T extends object>(
  obj: unknown,
  fields: (keyof T)[]
): obj is T {
  if (!obj || typeof obj !== "object") return false;
  return fields.every((field) => field in obj);
}
