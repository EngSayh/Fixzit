/**
 * 🔒 RELIABILITY TEST: utils/format.ts crash protection
 *
 * Verifies that fmtDate and fmtNumber handle edge cases gracefully:
 * - null/undefined inputs
 * - invalid date strings
 * - NaN values
 * - Performance with cached formatters
 */

import { describe, it, expect } from "vitest";
import { fmtDate, fmtNumber } from "@/utils/format";

describe("🔒 RELIABILITY: utils/format.ts - Crash Protection", () => {
  describe("fmtDate - null/undefined handling", () => {
    it('should return "Invalid Date" for null input', () => {
      const result = fmtDate(null, "en");
      expect(result).toBe("Invalid Date");
    });

    it('should return "Invalid Date" for undefined input', () => {
      const result = fmtDate(undefined, "en");
      expect(result).toBe("Invalid Date");
    });

    it('should return "Invalid Date" for invalid date string', () => {
      const result = fmtDate("not-a-date", "en");
      expect(result).toBe("Invalid Date");
    });

    it('should return "Invalid Date" for NaN', () => {
      const result = fmtDate(NaN, "en");
      expect(result).toBe("Invalid Date");
    });

    it('should return "Invalid Date" for invalid Date object', () => {
      const invalidDate = new Date("invalid");
      const result = fmtDate(invalidDate, "en");
      expect(result).toBe("Invalid Date");
    });
  });

  describe("fmtDate - valid inputs", () => {
    it("should format valid Date object in English", () => {
      const date = new Date("2024-01-15");
      const result = fmtDate(date, "en");
      expect(result).toBeTruthy();
      expect(result).not.toBe("Invalid Date");
      expect(result).toContain("Jan");
    });

    it("should format valid Date object in Arabic", () => {
      const date = new Date("2024-01-15");
      const result = fmtDate(date, "ar");
      expect(result).toBeTruthy();
      expect(result).not.toBe("Invalid Date");
    });

    it("should format timestamp in English", () => {
      const timestamp = Date.now();
      const result = fmtDate(timestamp, "en");
      expect(result).toBeTruthy();
      expect(result).not.toBe("Invalid Date");
    });

    it("should format ISO string in English", () => {
      const isoString = "2024-01-15T10:30:00Z";
      const result = fmtDate(isoString, "en");
      expect(result).toBeTruthy();
      expect(result).not.toBe("Invalid Date");
    });

    it("should respect custom options", () => {
      const date = new Date("2024-01-15");
      const result = fmtDate(date, "en", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      expect(result).toBeTruthy();
      expect(result).toContain("January");
      expect(result).toContain("2024");
    });
  });

  describe("fmtDate - edge cases", () => {
    it("should handle zero timestamp (Unix epoch)", () => {
      const result = fmtDate(0, "en");
      expect(result).toBeTruthy();
      expect(result).not.toBe("Invalid Date");
    });

    it("should handle negative timestamps", () => {
      const result = fmtDate(-86400000, "en"); // 1 day before epoch
      expect(result).toBeTruthy();
      expect(result).not.toBe("Invalid Date");
    });

    it("should handle far future dates", () => {
      const futureDate = new Date("2099-12-31");
      const result = fmtDate(futureDate, "en");
      expect(result).toBeTruthy();
      expect(result).not.toBe("Invalid Date");
    });

    it("should handle far past dates", () => {
      const pastDate = new Date("1900-01-01");
      const result = fmtDate(pastDate, "en");
      expect(result).toBeTruthy();
      expect(result).not.toBe("Invalid Date");
    });
  });

  describe("fmtNumber - basic functionality", () => {
    it("should format numbers in English locale", () => {
      const result = fmtNumber(1234567.89, "en");
      expect(result).toBeTruthy();
      expect(result).toContain(","); // English uses comma separators
    });

    it("should format numbers in Arabic locale", () => {
      const result = fmtNumber(1234567.89, "ar");
      expect(result).toBeTruthy();
    });

    it("should format zero", () => {
      const result = fmtNumber(0, "en");
      expect(result).toBe("0");
    });

    it("should format negative numbers", () => {
      const result = fmtNumber(-1234.56, "en");
      expect(result).toBeTruthy();
      expect(result).toContain("-");
    });

    it("should format decimal numbers", () => {
      const result = fmtNumber(0.123456, "en");
      expect(result).toBeTruthy();
    });
  });

  describe("🚀 PERFORMANCE: Formatter caching", () => {
    it("should execute multiple formats quickly (cached formatters)", () => {
      const startTime = performance.now();

      // Execute 1000 date formats - should be fast with caching
      for (let i = 0; i < 1000; i++) {
        fmtDate(new Date(), "en");
      }

      const duration = performance.now() - startTime;

      // With caching, 1000 formats should take < 100ms
      // Without caching (creating new Intl.DateTimeFormat each time), it would take 500ms+
      expect(duration).toBeLessThan(100);
    });

    it("should reuse cached formatters for repeated locale/options", () => {
      const date1 = fmtDate(new Date("2024-01-01"), "en");
      const date2 = fmtDate(new Date("2024-02-01"), "en");
      const date3 = fmtDate(new Date("2024-03-01"), "en");

      // All should succeed (verifying cache doesn't break functionality)
      expect(date1).toBeTruthy();
      expect(date2).toBeTruthy();
      expect(date3).toBeTruthy();
      expect(date1).not.toBe(date2);
      expect(date2).not.toBe(date3);
    });

    it("should maintain separate caches for different locales", () => {
      const dateEn = fmtDate(new Date("2024-01-15"), "en");
      const dateAr = fmtDate(new Date("2024-01-15"), "ar");

      expect(dateEn).toBeTruthy();
      expect(dateAr).toBeTruthy();
      // Different locales should produce different outputs
      expect(dateEn).not.toBe(dateAr);
    });
  });
});
