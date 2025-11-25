import { describe, it, expect } from "vitest";
import {
  sanitizePhoneNumber,
  formatCurrency,
  formatNumber,
} from "./formatters";

describe("sanitizePhoneNumber", () => {
  it("should preserve leading plus for international format", () => {
    expect(sanitizePhoneNumber("+1 (123) 456-7890")).toBe("+11234567890");
  });

  it("should handle Saudi numbers with international prefix", () => {
    expect(sanitizePhoneNumber("+966 50 123 4567")).toBe("+966501234567");
  });

  it("should handle empty or null input", () => {
    expect(sanitizePhoneNumber("")).toBe("");
    expect(sanitizePhoneNumber(null)).toBe("");
    expect(sanitizePhoneNumber(undefined)).toBe("");
  });

  it("should preserve leading plus and remove other formatting", () => {
    expect(sanitizePhoneNumber("+1-555-123-4567")).toBe("+15551234567");
    expect(sanitizePhoneNumber("+966 (55) 123-4567")).toBe("+966551234567");
  });

  it("should handle local numbers without plus", () => {
    expect(sanitizePhoneNumber("(555) 123.4567")).toBe("5551234567");
    expect(sanitizePhoneNumber("555 123 4567")).toBe("5551234567");
  });

  it("should preserve digits only when no leading plus", () => {
    expect(sanitizePhoneNumber("1234567890")).toBe("1234567890");
  });

  it("should handle numbers with extensions", () => {
    expect(sanitizePhoneNumber("+1 555 123 4567 ext. 123")).toBe(
      "+15551234567123",
    );
  });
});

describe("formatCurrency", () => {
  it("should format USD correctly with default options", () => {
    const result = formatCurrency(1234567.89, "USD");
    // The comprehensive formatter includes decimals by default for USD
    expect(result).toContain("1,234,567.89");
    expect(result).toContain("$");
  });

  it("should format SAR correctly with Arabic numerals", () => {
    const result = formatCurrency(1000, "SAR");
    // SAR uses ar-SA locale with Arabic or English numerals depending on environment
    expect(result).toMatch(/1[,٬]000|١[,٬]٠٠٠/);
    expect(result).toContain("ر.س");
  });

  it("should handle showSymbol option", () => {
    const result = formatCurrency(1234.56, "USD", { showSymbol: false });
    expect(result).not.toContain("$");
    expect(result).toContain("1,234.56");
  });

  it("should handle zero amounts", () => {
    const result = formatCurrency(0, "USD");
    expect(result).toContain("0");
  });

  it("should handle negative amounts", () => {
    const result = formatCurrency(-1000, "USD");
    expect(result).toContain("1,000");
  });

  it("should handle invalid amounts gracefully", () => {
    // parseCartAmount converts invalid values to 0, which is the expected behavior
    const result = formatCurrency("invalid" as any, "USD");
    expect(result).toContain("$0.00");
  });

  it("should handle compact notation for large numbers", () => {
    const result = formatCurrency(1000000, "USD", { compact: true });
    // Compact notation should use shortened form
    expect(result).toMatch(/1M|1\sM/i);
  });
});

describe("formatNumber", () => {
  it("should format numbers with grouping separators", () => {
    expect(formatNumber(12345)).toBe("12,345");
  });

  it("should round decimals by default", () => {
    expect(formatNumber(12345.67)).toBe("12,346");
    expect(formatNumber(12345.4)).toBe("12,345");
  });

  it("should preserve decimals when round is false", () => {
    const result = formatNumber(1234567.89, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      round: false,
    });
    expect(result).toBe("1,234,567.89");
  });

  it("should handle zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("should handle large numbers", () => {
    expect(formatNumber(1234567890)).toBe("1,234,567,890");
  });

  it("should handle negative numbers", () => {
    const result = formatNumber(-12345);
    expect(result).toContain("12,345");
  });

  it("should support Arabic locale formatting", () => {
    const result = formatNumber(12345, { locale: "ar-SA" });
    // Arabic numerals use different separators
    expect(result).toMatch(/12[٬,]345|١٢٬٣٤٥/);
  });

  it("should handle decimal places configuration", () => {
    const result = formatNumber(100, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      round: false,
    });
    expect(result).toBe("100.00");
  });

  it("should handle maximum fraction digits", () => {
    const result = formatNumber(123.456789, {
      maximumFractionDigits: 2,
      round: false,
    });
    expect(result).toBe("123.46");
  });
});
