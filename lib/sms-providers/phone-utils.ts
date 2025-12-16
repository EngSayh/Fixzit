/**
 * @module lib/sms-providers/phone-utils
 * @description Shared phone number utilities for SMS providers.
 *
 * Provides centralized phone formatting and validation for Saudi Arabian numbers.
 * Used by Taqnyat SMS provider (CITC-compliant production provider).
 *
 * @features
 * - E.164 format conversion (+966XXXXXXXXX)
 * - Multi-format input support (local 05X, country code 966, international 00966)
 * - Saudi phone number validation (9 digits after country code)
 * - Automatic prefix normalization
 *
 * @usage
 * ```typescript
 * const formatted = formatSaudiPhoneNumber('0501234567'); // '+966501234567'
 * const isValid = isValidSaudiPhone('+966501234567');    // true
 * ```
 */

/**
 * Format phone number to E.164 format for Saudi Arabia (+966XXXXXXXXX)
 * Handles common Saudi phone number formats:
 * - Local: 05XXXXXXXX -> +9665XXXXXXXX
 * - With country code: 9665XXXXXXXX -> +9665XXXXXXXX
 * - International: 009665XXXXXXXX -> +9665XXXXXXXX
 * - E.164: +9665XXXXXXXX -> +9665XXXXXXXX
 */
export function formatSaudiPhoneNumber(phone: string): string {
  // Remove all spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-()]/g, "");

  // If already in E.164 format
  if (cleaned.startsWith("+966")) {
    return cleaned;
  }

  // Handle 00 prefix (international dialing)
  if (cleaned.startsWith("00966")) {
    return "+" + cleaned.substring(2);
  }

  // Handle just country code without +
  if (cleaned.startsWith("966")) {
    return "+" + cleaned;
  }

  // Handle local format with leading 0
  if (cleaned.startsWith("0")) {
    return "+966" + cleaned.substring(1);
  }

  // Assume local number without prefix
  return "+966" + cleaned;
}

/**
 * Validate Saudi phone number
 *
 * Saudi mobile numbers follow the pattern: +966 5XX XXX XXXX
 * - Country code: +966
 * - Mobile prefix: 5 (all Saudi mobile numbers start with 5)
 * - Total digits after country code: 9
 *
 * @param phone - Phone number in any supported format
 * @returns true if valid Saudi mobile number
 */
export function isValidSaudiPhone(phone: string): boolean {
  const formatted = formatSaudiPhoneNumber(phone);
  // Saudi mobile numbers start with +966 5 and have 9 digits total after country code
  return /^\+9665\d{8}$/.test(formatted);
}

/**
 * Validate and format a phone number
 *
 * @param phone - Phone number in any supported format
 * @returns Object with formatted number and validation result
 */
export function validateAndFormatPhone(phone: string): {
  formatted: string;
  isValid: boolean;
  error?: string;
} {
  const formatted = formatSaudiPhoneNumber(phone);
  const isValid = isValidSaudiPhone(formatted);

  return {
    formatted,
    isValid,
    error: isValid ? undefined : `Invalid Saudi phone number format: ${phone}`,
  };
}

/**
 * Redact phone number for logging (privacy)
 * Example: +966501234567 -> +966 5XX XXX X567
 */
export function redactPhoneNumber(phone: string): string {
  const formatted = formatSaudiPhoneNumber(phone);
  if (formatted.length < 8) return "***";

  // Show country code, first digit, and last 4 digits
  const countryCode = formatted.substring(0, 4); // +966
  const firstDigit = formatted[4] || "X";
  const lastFour = formatted.slice(-4);

  return `${countryCode} ${firstDigit}XX XXX ${lastFour}`;
}
