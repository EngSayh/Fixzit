/**
 * Unit tests for SMS Provider Phone Utilities
 *
 * Tests phone number formatting and validation for Saudi Arabian numbers.
 */

import { describe, it, expect } from "vitest";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

import {
  formatSaudiPhoneNumber,
  isValidSaudiPhone,
  validateAndFormatPhone,
  redactPhoneNumber,
} from "@/lib/sms-providers/phone-utils";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});

describe("formatSaudiPhoneNumber", () => {
  it("should return E.164 format unchanged", () => {
    expect(formatSaudiPhoneNumber("+966501234567")).toBe("+966501234567");
    expect(formatSaudiPhoneNumber("+966512345678")).toBe("+966512345678");
  });

  it("should convert local format (05XXXXXXXX)", () => {
    expect(formatSaudiPhoneNumber("0501234567")).toBe("+966501234567");
    expect(formatSaudiPhoneNumber("0512345678")).toBe("+966512345678");
  });

  it("should convert 966 format without plus", () => {
    expect(formatSaudiPhoneNumber("966501234567")).toBe("+966501234567");
    expect(formatSaudiPhoneNumber("966512345678")).toBe("+966512345678");
  });

  it("should convert 00966 international format", () => {
    expect(formatSaudiPhoneNumber("00966501234567")).toBe("+966501234567");
    expect(formatSaudiPhoneNumber("00966512345678")).toBe("+966512345678");
  });

  it("should handle number without any prefix", () => {
    expect(formatSaudiPhoneNumber("501234567")).toBe("+966501234567");
    expect(formatSaudiPhoneNumber("512345678")).toBe("+966512345678");
  });

  it("should remove spaces, dashes, and parentheses", () => {
    expect(formatSaudiPhoneNumber("+966 50 123 4567")).toBe("+966501234567");
    expect(formatSaudiPhoneNumber("050-123-4567")).toBe("+966501234567");
    expect(formatSaudiPhoneNumber("(050) 123-4567")).toBe("+966501234567");
  });
});

describe("isValidSaudiPhone", () => {
  it("should accept valid Saudi mobile numbers", () => {
    expect(isValidSaudiPhone("+966501234567")).toBe(true);
    expect(isValidSaudiPhone("0501234567")).toBe(true);
    expect(isValidSaudiPhone("966501234567")).toBe(true);
    expect(isValidSaudiPhone("00966501234567")).toBe(true);
  });

  it("should accept all Saudi mobile prefixes (5X)", () => {
    // Saudi mobile numbers start with 5
    expect(isValidSaudiPhone("+966500000000")).toBe(true);
    expect(isValidSaudiPhone("+966510000000")).toBe(true);
    expect(isValidSaudiPhone("+966520000000")).toBe(true);
    expect(isValidSaudiPhone("+966530000000")).toBe(true);
    expect(isValidSaudiPhone("+966540000000")).toBe(true);
    expect(isValidSaudiPhone("+966550000000")).toBe(true);
    expect(isValidSaudiPhone("+966560000000")).toBe(true);
    expect(isValidSaudiPhone("+966570000000")).toBe(true);
    expect(isValidSaudiPhone("+966580000000")).toBe(true);
    expect(isValidSaudiPhone("+966590000000")).toBe(true);
  });

  it("should reject landline numbers (not starting with 5)", () => {
    // Saudi landlines start with 1 (Riyadh), 2 (Makkah), etc.
    expect(isValidSaudiPhone("+966112345678")).toBe(false);
    expect(isValidSaudiPhone("+966212345678")).toBe(false);
    expect(isValidSaudiPhone("+966312345678")).toBe(false);
  });

  it("should reject numbers with wrong length", () => {
    expect(isValidSaudiPhone("+96650123456")).toBe(false); // too short
    expect(isValidSaudiPhone("+9665012345678")).toBe(false); // too long
    expect(isValidSaudiPhone("+96650")).toBe(false); // way too short
  });

  it("should reject invalid country codes", () => {
    expect(isValidSaudiPhone("+1501234567")).toBe(false);
    expect(isValidSaudiPhone("+971501234567")).toBe(false); // UAE
  });
});

describe("validateAndFormatPhone", () => {
  it("should return valid result for correct numbers", () => {
    const result = validateAndFormatPhone("0501234567");
    expect(result.formatted).toBe("+966501234567");
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should return invalid result with error for bad numbers", () => {
    const result = validateAndFormatPhone("+966112345678"); // landline
    expect(result.formatted).toBe("+966112345678");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Invalid Saudi phone number format: +966112345678");
  });
});

describe("redactPhoneNumber", () => {
  it("should redact phone number for privacy", () => {
    expect(redactPhoneNumber("+966501234567")).toBe("+966 5XX XXX 4567");
    expect(redactPhoneNumber("0501234567")).toBe("+966 5XX XXX 4567");
  });

  it("should handle very short numbers gracefully", () => {
    expect(redactPhoneNumber("123")).toBe("***");
    expect(redactPhoneNumber("")).toBe("***");
  });

  it("should show country code, first digit, and last 4", () => {
    const redacted = redactPhoneNumber("+966512345678");
    expect(redacted).toContain("+966");
    expect(redacted).toContain("5678"); // last 4
    expect(redacted).toContain("5XX XXX"); // redacted middle
  });
});
