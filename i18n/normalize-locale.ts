/**
 * Locale Normalization Utility
 * Server-safe module for normalizing locale codes
 * 
 * @module i18n/normalize-locale
 */

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "./config";

/**
 * Normalize locale codes (ar-SA, AR_SA, ar-sa) → ar
 * Handles browser locale strings like "ar-SA" from navigator.language
 * Server-safe (no React dependencies)
 * 
 * @public - exported for use in server and client components
 */
export function normalizeLocale(raw?: string): Locale {
  if (!raw) return DEFAULT_LOCALE;
  const normalized = raw.toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LOCALES.includes(normalized as Locale)
    ? (normalized as Locale)
    : DEFAULT_LOCALE;
}
