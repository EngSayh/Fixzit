/**
 * Security utilities for working with regular expressions.
 * Prevents regex injection attacks by properly escaping user input.
 */

/**
 * Escapes special regex characters in a string to safely use it in RegExp constructor.
 * This prevents regex injection attacks (ReDoS) when constructing regex from user input.
 *
 * @param str - The string to escape
 * @returns The escaped string safe for use in RegExp
 *
 * @example
 * ```typescript
 * const userInput = "hello (world)";
 * const pattern = new RegExp(escapeRegExp(userInput), "i"); // Safe
 * ```
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Creates a safe regex pattern for case-insensitive exact matching.
 * Use this when you need to match user input exactly (not as a substring).
 *
 * @param value - The value to match exactly
 * @returns A regex pattern that matches the value exactly (case-insensitive)
 */
export function safeExactMatchRegex(value: string): RegExp {
  return new RegExp(`^${escapeRegExp(value)}$`, "i");
}

/**
 * Creates a safe regex pattern for case-insensitive contains matching.
 * Use this when you want to search for user input as a substring.
 *
 * @param value - The value to search for
 * @returns A regex pattern that matches if value is contained (case-insensitive)
 */
export function safeContainsRegex(value: string): RegExp {
  return new RegExp(escapeRegExp(value), "i");
}
