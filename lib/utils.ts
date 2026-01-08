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

export function normalizeUnicode(
  input: string,
  form: "NFC" | "NFKC" = "NFC",
): string {
  return input.normalize(form);
}

export function generateSlug(input: string | null | undefined): string {
  // Handle null/undefined/non-string inputs
  if (input == null || typeof input !== "string") {
    return "";
  }

  // NFC normalization: stabilize composed/decomposed Unicode inputs
  // e.g., "café" (NFD: e + combining acute) → "café" (NFC: precomposed é)
  const src = normalizeUnicode(input, "NFC").trim();
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
/**
 * Format a date string for display using the user's locale.
 * Falls back to "en-US" if locale is not provided.
 * 
 * @param dateStr - ISO date string or Date object
 * @param locale - User locale (e.g., "en-US", "ar-SA")
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string or "N/A" for invalid dates
 * 
 * @example
 * formatDateLocale("2026-01-08", "ar-SA") // "٨ يناير ٢٠٢٦"
 * formatDateLocale("2026-01-08", "en-US") // "Jan 8, 2026"
 */
export function formatDateLocale(
  dateStr?: string | Date | null,
  locale: string = "en-US",
  options: Intl.DateTimeFormatOptions = { 
    month: "short", 
    day: "numeric", 
    year: "numeric" 
  }
): string {
  if (!dateStr) return "N/A";
  try {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString(locale, options);
  } catch {
    return "N/A";
  }
}

/**
 * Format a date-time string for display using the user's locale.
 * 
 * @param dateStr - ISO date string or Date object
 * @param locale - User locale
 * @returns Formatted date-time string
 */
export function formatDateTimeLocale(
  dateStr?: string | Date | null,
  locale: string = "en-US"
): string {
  return formatDateLocale(dateStr, locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a relative time (e.g., "2 hours ago", "in 3 days", "1 month ago")
 * Extended to handle months and years for larger time spans (Gemini review)
 * 
 * @param dateStr - ISO date string or Date object
 * @param locale - User locale
 * @returns Relative time string
 */
export function formatRelativeTime(
  dateStr?: string | Date | null,
  locale: string = "en-US"
): string {
  if (!dateStr) return "N/A";
  try {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    if (isNaN(date.getTime())) return "N/A";
    
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);
    const diffMonth = Math.round(diffDay / 30.44); // Average days in a month
    const diffYear = Math.round(diffDay / 365.25); // Account for leap years
    
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    
    if (Math.abs(diffSec) < 60) return rtf.format(diffSec, "second");
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
    if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
    if (Math.abs(diffDay) < 30) return rtf.format(diffDay, "day");
    if (Math.abs(diffMonth) < 12) return rtf.format(diffMonth, "month");
    return rtf.format(diffYear, "year");
  } catch {
    return "N/A";
  }
}
