/**
 * Tests for currency formatter utility
 * @module tests/unit/lib/utils/currency-formatter.test
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  formatCurrency,
  formatCurrencyAr,
  formatCurrencyEn,
  formatPriceRange,
  parseCurrency,
  getCurrencyInfo,
  getSupportedCurrencies,
  isSupportedCurrency,
  CURRENCIES,
} from "@/lib/utils/currency-formatter";

// Mock the tenant config
vi.mock("@/lib/config/tenant", () => ({
  getCurrency: vi.fn().mockReturnValue("SAR"),
  getTimezone: vi.fn().mockReturnValue("Asia/Riyadh"),
}));

describe("Currency Formatter", () => {
  describe("formatCurrency", () => {
    it("should format a positive number", () => {
      const result = formatCurrency(1234.56);
      // Use regex to match either Western (1-9) or Arabic-Indic numerals (٠-٩)
      expect(result).toMatch(/[1٠-٩]/);
      expect(result).toBeDefined();
    });

    it("should format zero", () => {
      const result = formatCurrency(0);
      expect(result).toBeDefined();
    });

    it("should handle null", () => {
      const result = formatCurrency(null);
      expect(result).toBeDefined();
    });

    it("should handle undefined", () => {
      const result = formatCurrency(undefined);
      expect(result).toBeDefined();
    });

    it("should handle string numbers", () => {
      const result = formatCurrency("1234.56");
      // Use regex to match either Western (1-9) or Arabic-Indic numerals (٠-٩)
      expect(result).toMatch(/[1-9٠-٩]/);
    });

    it("should handle NaN strings", () => {
      const result = formatCurrency("not a number");
      expect(result).toBeDefined();
    });

    it("should respect currency option", () => {
      const result = formatCurrency(1234.56, { currency: "USD" });
      const containsDollarOrUSD = result.includes("$") || result.includes("USD");
      expect(containsDollarOrUSD).toBe(true);
    });

    it("should handle showSymbol false", () => {
      const result = formatCurrency(1234.56, { showSymbol: false });
      expect(result).not.toContain("SAR");
    });

    it("should respect decimals option", () => {
      const result = formatCurrency(1234.567, { decimals: 0, showSymbol: false });
      expect(result).not.toContain(".");
    });

    it("should handle compact notation", () => {
      const result = formatCurrency(1000000, { compact: true });
      // Compact notation should be shorter than full formatted (allow for Arabic which is slightly longer)
      expect(result.length).toBeLessThan(20);
    });

    it("should handle negative numbers", () => {
      const result = formatCurrency(-1234.56);
      const containsNegative = result.includes("-") || result.includes("(");
      expect(containsNegative).toBe(true);
    });

    it("should handle very large numbers", () => {
      const result = formatCurrency(123456789012.34);
      expect(result).toBeDefined();
    });

    it("should handle very small numbers", () => {
      const result = formatCurrency(0.01);
      expect(result).toBeDefined();
    });
  });

  describe("formatCurrencyAr", () => {
    it("should format in Arabic locale", () => {
      const result = formatCurrencyAr(1234.56);
      expect(result).toBeDefined();
    });

    it("should handle different currencies", () => {
      const result = formatCurrencyAr(1234.56, "AED");
      expect(result).toBeDefined();
    });
  });

  describe("formatCurrencyEn", () => {
    it("should format in English locale", () => {
      const result = formatCurrencyEn(1234.56);
      expect(result).toBeDefined();
      expect(result).toMatch(/\d/);
    });

    it("should handle different currencies", () => {
      const result = formatCurrencyEn(1234.56, "USD");
      expect(result).toBeDefined();
    });
  });

  describe("formatPriceRange", () => {
    it("should format a price range", () => {
      const result = formatPriceRange(1000, 5000);
      expect(result).toContain("-");
    });

    it("should include both min and max", () => {
      const result = formatPriceRange(1000, 5000, { showSymbol: false });
      // Use regex to match either Western (1-9) or Arabic-Indic numerals (٠-٩)
      expect(result).toMatch(/[1-9٠-٩]/);
      expect(result).toMatch(/[5٥]/);
    });

    it("should respect currency option", () => {
      const result = formatPriceRange(1000, 5000, { currency: "USD" });
      expect(result).toBeDefined();
    });
  });

  describe("parseCurrency", () => {
    it("should parse formatted currency string", () => {
      const result = parseCurrency("SAR 1,234.56");
      expect(result).toBe(1234.56);
    });

    it("should parse number with commas", () => {
      const result = parseCurrency("1,234,567.89");
      expect(result).toBe(1234567.89);
    });

    it("should return NaN for empty string", () => {
      const result = parseCurrency("");
      expect(isNaN(result)).toBe(true);
    });

    it("should handle currency symbols", () => {
      const result = parseCurrency("$1,234.56");
      expect(result).toBe(1234.56);
    });

    it("should handle Arabic formatted numbers", () => {
      // After removing non-numeric chars, should still parse
      const result = parseCurrency("1234.56");
      expect(result).toBe(1234.56);
    });

    it("should handle negative values", () => {
      const result = parseCurrency("-1,234.56");
      expect(result).toBe(-1234.56);
    });
  });

  describe("getCurrencyInfo", () => {
    it("should return info for SAR", () => {
      const info = getCurrencyInfo("SAR");
      expect(info).toBeDefined();
      expect(info?.code).toBe("SAR");
      expect(info?.symbol).toBe("ر.س");
    });

    it("should return info for USD", () => {
      const info = getCurrencyInfo("USD");
      expect(info).toBeDefined();
      expect(info?.code).toBe("USD");
      expect(info?.symbol).toBe("$");
    });

    it("should fallback to SAR for unknown currency", () => {
      const info = getCurrencyInfo("XYZ");
      expect(info).toBeDefined();
      expect(info?.code).toBe("SAR"); // Falls back to default currency
    });

    it("should handle lowercase codes", () => {
      const info = getCurrencyInfo("sar");
      expect(info).toBeDefined();
    });
  });

  describe("getSupportedCurrencies", () => {
    it("should return array of currency codes", () => {
      const currencies = getSupportedCurrencies();
      expect(Array.isArray(currencies)).toBe(true);
      expect(currencies.length).toBeGreaterThan(0);
    });

    it("should include SAR", () => {
      const currencies = getSupportedCurrencies();
      expect(currencies).toContain("SAR");
    });

    it("should include common currencies", () => {
      const currencies = getSupportedCurrencies();
      expect(currencies).toContain("USD");
      expect(currencies).toContain("EUR");
      expect(currencies).toContain("GBP");
    });

    it("should include GCC currencies", () => {
      const currencies = getSupportedCurrencies();
      expect(currencies).toContain("AED");
      expect(currencies).toContain("OMR");
      expect(currencies).toContain("KWD");
      expect(currencies).toContain("BHD");
      expect(currencies).toContain("QAR");
    });
  });

  describe("isSupportedCurrency", () => {
    it("should return true for supported currencies", () => {
      expect(isSupportedCurrency("SAR")).toBe(true);
      expect(isSupportedCurrency("USD")).toBe(true);
      expect(isSupportedCurrency("EUR")).toBe(true);
    });

    it("should return false for unsupported currencies", () => {
      expect(isSupportedCurrency("XYZ")).toBe(false);
      expect(isSupportedCurrency("ABC")).toBe(false);
    });

    it("should handle lowercase", () => {
      expect(isSupportedCurrency("sar")).toBe(true);
      expect(isSupportedCurrency("usd")).toBe(true);
    });
  });

  describe("CURRENCIES constant", () => {
    it("should have correct structure for each currency", () => {
      Object.values(CURRENCIES).forEach((currency) => {
        expect(currency).toHaveProperty("code");
        expect(currency).toHaveProperty("symbol");
        expect(currency).toHaveProperty("name");
        expect(currency).toHaveProperty("decimals");
      });
    });

    it("should have 2 or 3 decimals for each currency", () => {
      Object.values(CURRENCIES).forEach((currency) => {
        expect([2, 3]).toContain(currency.decimals);
      });
    });

    it("should have non-empty names", () => {
      Object.values(CURRENCIES).forEach((currency) => {
        expect(currency.name.length).toBeGreaterThan(0);
      });
    });
  });
});
