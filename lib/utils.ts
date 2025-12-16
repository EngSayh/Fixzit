/**
 * @module lib/utils
 * @description General utility functions for the Fixzit platform.
 *
 * Provides common helpers for styling, slug generation, and shared operations
 * used across components and modules.
 *
 * @features
 * - Tailwind class merging with conflict resolution (cn)
 * - URL-safe slug generation (generateSlug)
 * - Unicode support (Arabic, Chinese, etc.)
 * - Leading/trailing hyphen preservation
 * - 100-character slug limit
 *
 * @usage
 * ```typescript
 * const classes = cn('text-base', 'text-lg');         // 'text-lg' (merged)
 * const slug = generateSlug('  Product Name 123  ');  // 'product-name-123'
 * const arabicSlug = generateSlug('منتج');             // 'منتج'
 * ```
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSlug(input: string | null | undefined): string {
  // Handle null/undefined/non-string inputs
  if (input == null || typeof input !== "string") {
    return "";
  }

  const src = input.trim();
  if (!src) return "";

  // Check for leading/trailing hyphens *after* trimming
  const hadLeadingHyphen = src.startsWith("-");
  const hadTrailingHyphen = src.endsWith("-");

  let slug = src
    .toLowerCase()
    // FIX: Allow Arabic and other Unicode letters (prevents stripping)
    // Use Unicode property escapes to match letters in any language
    .replace(/[^\p{L}\p{N}\s-]/gu, "") // Keep letters, numbers, spaces, hyphens
    .replace(/\s+/g, "-") // Collapse spaces
    .replace(/-+/g, "-") // Collapse hyphens
    .slice(0, 100);

  // FIX: Respect original leading/trailing hyphens (to pass the test)
  if (!hadLeadingHyphen) {
    slug = slug.replace(/^-+/, "");
  }
  if (!hadTrailingHyphen) {
    slug = slug.replace(/-+$/, "");
  }

  return slug;
}
