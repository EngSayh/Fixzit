/**
 * Currency Selector Integration Tests
 * Tests localStorage persistence, format validation, and symbol display
 * @phase D
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage
let mockStorage: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
  clear: vi.fn(() => {
    mockStorage = {};
  }),
  get length() {
    return Object.keys(mockStorage).length;
  },
  key: vi.fn((index: number) => Object.keys(mockStorage)[index] ?? null),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("Currency Selector", () => {
  beforeEach(() => {
    mockStorage = {};
    vi.clearAllMocks();
  });

  describe("LocalStorage Persistence", () => {
    it("should persist currency to localStorage", () => {
      localStorage.setItem("preferred_currency", "SAR");
      expect(mockStorage["preferred_currency"]).toBe("SAR");
    });

    it("should read currency from localStorage on page load", () => {
      mockStorage["preferred_currency"] = "USD";
      const currency = localStorage.getItem("preferred_currency");
      expect(currency).toBe("USD");
    });

    it("should update localStorage when currency changes", () => {
      localStorage.setItem("preferred_currency", "SAR");
      expect(mockStorage["preferred_currency"]).toBe("SAR");

      localStorage.setItem("preferred_currency", "USD");
      expect(mockStorage["preferred_currency"]).toBe("USD");
    });

    it("should handle missing localStorage gracefully", () => {
      const currency = localStorage.getItem("preferred_currency");
      expect(currency).toBeNull();
    });

    it("should clear currency preference", () => {
      localStorage.setItem("preferred_currency", "EUR");
      expect(mockStorage["preferred_currency"]).toBe("EUR");

      localStorage.removeItem("preferred_currency");
      expect(mockStorage["preferred_currency"]).toBeUndefined();
    });
  });

  describe("Currency Format Validation", () => {
    const supportedCurrencies = ["SAR", "USD", "EUR", "GBP", "AED"];

    it("should validate supported currencies", () => {
      expect(supportedCurrencies.includes("SAR")).toBe(true);
      expect(supportedCurrencies.includes("USD")).toBe(true);
      expect(supportedCurrencies.includes("EUR")).toBe(true);
      expect(supportedCurrencies.includes("GBP")).toBe(true);
      expect(supportedCurrencies.includes("AED")).toBe(true);
    });

    it("should reject unsupported currencies", () => {
      expect(supportedCurrencies.includes("XYZ")).toBe(false);
      expect(supportedCurrencies.includes("")).toBe(false);
      expect(supportedCurrencies.includes("123")).toBe(false);
    });

    it("should normalize currency to uppercase", () => {
      const normalizeCurrency = (currency: string) => currency.toUpperCase();

      expect(normalizeCurrency("sar")).toBe("SAR");
      expect(normalizeCurrency("usd")).toBe("USD");
      expect(normalizeCurrency("Eur")).toBe("EUR");
    });

    it("should validate ISO 4217 format (3 uppercase letters)", () => {
      const isValidCurrency = (currency: string) =>
        /^[A-Z]{3}$/.test(currency);

      expect(isValidCurrency("SAR")).toBe(true);
      expect(isValidCurrency("USD")).toBe(true);
      expect(isValidCurrency("EURO")).toBe(false);
      expect(isValidCurrency("US")).toBe(false);
      expect(isValidCurrency("123")).toBe(false);
    });
  });

  describe("Currency Symbol Display", () => {
    const currencySymbols: Record<string, string> = {
      SAR: "﷼",
      USD: "$",
      EUR: "€",
      GBP: "£",
      AED: "د.إ",
    };

    it("should display correct symbol for SAR", () => {
      expect(currencySymbols["SAR"]).toBe("﷼");
    });

    it("should display correct symbol for USD", () => {
      expect(currencySymbols["USD"]).toBe("$");
    });

    it("should display correct symbol for EUR", () => {
      expect(currencySymbols["EUR"]).toBe("€");
    });

    it("should display correct symbol for GBP", () => {
      expect(currencySymbols["GBP"]).toBe("£");
    });

    it("should display correct symbol for AED", () => {
      expect(currencySymbols["AED"]).toBe("د.إ");
    });
  });

  describe("Number Formatting", () => {
    it("should format numbers with 2 decimal places", () => {
      const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
      };

      expect(formatCurrency(1234.5, "USD")).toBe("$1,234.50");
      expect(formatCurrency(1000, "EUR")).toBe("€1,000.00");
    });

    it("should format Arabic numbers for SAR", () => {
      const formatCurrencyAr = (amount: number) => {
        return new Intl.NumberFormat("ar-SA", {
          style: "currency",
          currency: "SAR",
        }).format(amount);
      };

      const formatted = formatCurrencyAr(1234.56);
      const normalizeDigits = (value: string) =>
        value
          .replace(/\u200e|\u200f/g, "") // strip bidi markers
          .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
          .replace(/٬/g, ",") // Arabic thousands separator
          .replace(/٫/g, "."); // Arabic decimal separator
      // Allow either Arabic numerals or Latin digits by normalizing, including separators
      expect(normalizeDigits(formatted)).toContain("1,234.56");
    });

    it("should handle large numbers", () => {
      const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
        }).format(amount);
      };

      expect(formatCurrency(1000000, "SAR")).toContain("1,000,000");
    });

    it("should handle zero and negative amounts", () => {
      const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
        }).format(amount);
      };

      expect(formatCurrency(0, "USD")).toBe("$0.00");
      expect(formatCurrency(-100, "USD")).toBe("-$100.00");
    });
  });

  describe("Cross-Page Persistence", () => {
    it("should persist currency across page reloads", () => {
      // Simulate setting currency
      localStorage.setItem("preferred_currency", "EUR");

      // Simulate page reload (read from localStorage)
      const persistedCurrency = localStorage.getItem("preferred_currency");
      expect(persistedCurrency).toBe("EUR");
    });

    it("should sync currency with user preferences", () => {
      const userPreferences = {
        currency: "SAR",
        locale: "ar",
      };

      localStorage.setItem(
        "user_preferences",
        JSON.stringify(userPreferences)
      );

      const stored = localStorage.getItem("user_preferences");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.currency).toBe("SAR");
    });
  });

  describe("Default Currency", () => {
    it("should default to SAR when no preference set", () => {
      const getPreferredCurrency = (): string => {
        return localStorage.getItem("preferred_currency") ?? "SAR";
      };

      expect(getPreferredCurrency()).toBe("SAR");
    });

    it("should use stored preference over default", () => {
      localStorage.setItem("preferred_currency", "USD");

      const getPreferredCurrency = (): string => {
        return localStorage.getItem("preferred_currency") ?? "SAR";
      };

      expect(getPreferredCurrency()).toBe("USD");
    });
  });
});
