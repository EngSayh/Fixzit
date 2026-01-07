/**
 * @fileoverview Tests for Currency Service
 * @module tests/services/finance/currency-service.test
 *
 * LOGIC-003: Test coverage for live currency conversion
 *
 * @author [AGENT-0041]
 * @created 2026-01-07
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import { getDatabase } from "@/lib/mongodb-unified";
import {
  getExchangeRate,
  convertCurrency,
  getAllRates,
  refreshRates,
} from "@/services/finance/currency-service";

describe("Currency Service", () => {
  const mockDb = {
    collection: vi.fn(),
  };

  const mockCollection = {
    findOne: vi.fn(),
    updateOne: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getDatabase as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);
    mockDb.collection.mockReturnValue(mockCollection);
    
    // Reset fetch mock
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getExchangeRate", () => {
    it("should return rate of 1 for same currency", async () => {
      const result = await getExchangeRate("SAR", "SAR");

      expect(result.rate).toBe(1);
      expect(result.source).toBe("live");
    });

    it("should return cached rate when available", async () => {
      const cachedData = {
        base: "SAR",
        rates: { USD: 0.2667, EUR: 0.2453 },
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      };

      mockCollection.findOne.mockResolvedValue(cachedData);

      const result = await getExchangeRate("SAR", "USD");

      expect(result.rate).toBe(0.2667);
      expect(result.source).toBe("cached");
    });

    it("should fetch live rates when cache expired", async () => {
      // No cached data (expired)
      mockCollection.findOne.mockResolvedValue(null);

      // Mock fetch response
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            result: "success",
            conversion_rates: { USD: 0.2670, EUR: 0.2460 },
          }),
      });

      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await getExchangeRate("SAR", "USD");

      expect(result.rate).toBe(0.2670);
      expect(result.source).toBe("live");
      expect(global.fetch).toHaveBeenCalled();
    });

    it("should use fallback rates when API fails", async () => {
      mockCollection.findOne.mockResolvedValue(null);
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error")
      );

      const result = await getExchangeRate("SAR", "USD");

      expect(result.rate).toBe(0.2667); // Fallback rate
      expect(result.source).toBe("fallback");
    });

    it("should use fallback rates when API returns error", async () => {
      mockCollection.findOne.mockResolvedValue(null);
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 429,
      });

      const result = await getExchangeRate("SAR", "EUR");

      expect(result.rate).toBe(0.2453);
      expect(result.source).toBe("fallback");
    });

    it("should calculate inverse rate when direct not available", async () => {
      mockCollection.findOne.mockResolvedValue(null);
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
      });

      // AED to SAR - need to use inverse of SAR to AED
      const result = await getExchangeRate("AED", "SAR");

      // SAR to AED is 0.9793, so AED to SAR is 1/0.9793 ≈ 1.0211
      expect(result.rate).toBeCloseTo(1 / 0.9793, 2);
      expect(result.source).toBe("fallback");
    });

    it("should throw error when no rate available", async () => {
      mockCollection.findOne.mockResolvedValue(null);
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
      });

      // XYZ is not a real currency
      await expect(getExchangeRate("XYZ", "ABC")).rejects.toThrow(
        "No exchange rate available for XYZ to ABC"
      );
    });
  });

  describe("convertCurrency", () => {
    it("should convert amount correctly", async () => {
      mockCollection.findOne.mockResolvedValue({
        base: "SAR",
        rates: { USD: 0.2667 },
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      });

      const result = await convertCurrency(1000, "SAR", "USD");

      expect(result.fromAmount).toBe(1000);
      expect(result.fromCurrency).toBe("SAR");
      expect(result.toAmount).toBe(266.7);
      expect(result.toCurrency).toBe("USD");
      expect(result.rate).toBe(0.2667);
    });

    it("should handle case insensitive currency codes", async () => {
      mockCollection.findOne.mockResolvedValue({
        base: "SAR",
        rates: { USD: 0.2667 },
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      });

      const result = await convertCurrency(100, "sar", "usd");

      expect(result.fromCurrency).toBe("SAR");
      expect(result.toCurrency).toBe("USD");
    });

    it("should round to 2 decimal places", async () => {
      mockCollection.findOne.mockResolvedValue({
        base: "SAR",
        rates: { USD: 0.26666667 },
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      });

      const result = await convertCurrency(100, "SAR", "USD");

      expect(result.toAmount).toBe(26.67);
    });
  });

  describe("getAllRates", () => {
    it("should return all cached rates", async () => {
      const cachedData = {
        base: "SAR",
        rates: { USD: 0.2667, EUR: 0.2453, GBP: 0.2107 },
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      mockCollection.findOne.mockResolvedValue(cachedData);

      const result = await getAllRates("SAR");

      expect(result.base).toBe("SAR");
      expect(Object.keys(result.rates)).toHaveLength(3);
      expect(result.source).toBe("cached");
    });

    it("should fetch and return live rates when no cache", async () => {
      mockCollection.findOne.mockResolvedValue(null);
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            result: "success",
            conversion_rates: { USD: 0.2670, EUR: 0.2460 },
          }),
      });
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await getAllRates("SAR");

      expect(result.base).toBe("SAR");
      expect(result.source).toBe("live");
    });
  });

  describe("refreshRates", () => {
    it("should refresh rates for multiple base currencies", async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              result: "success",
              conversion_rates: { USD: 0.2670 },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              result: "success",
              conversion_rates: { SAR: 3.75 },
            }),
        });

      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await refreshRates(["SAR", "USD"]);

      expect(result.refreshed).toContain("SAR");
      expect(result.refreshed).toContain("USD");
      expect(result.failed).toHaveLength(0);
    });

    it("should track failed refreshes", async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              result: "success",
              conversion_rates: { USD: 0.2670 },
            }),
        })
        .mockRejectedValueOnce(new Error("API error"));

      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await refreshRates(["SAR", "EUR"]);

      expect(result.refreshed).toContain("SAR");
      expect(result.failed).toContain("EUR");
    });
  });
});
