/**
 * @fileoverview Tests for Currency Service
 * @module tests/services/finance/currency-service.test
 *
 * LOGIC-003: Test coverage for live currency conversion
 *
 * @author [AGENT-0041]
 * @created 2026-01-07
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";

// Create mock objects OUTSIDE vi.mock
const mockCollection = {
  findOne: vi.fn(),
  updateOne: vi.fn(),
};

const mockDb = {
  collection: vi.fn().mockReturnValue(mockCollection),
};

// Mock dependencies
vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn(() => Promise.resolve(mockDb)),
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
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementations
    mockCollection.findOne.mockReset();
    mockCollection.updateOne.mockReset();
    mockDb.collection.mockReturnValue(mockCollection);
    (getDatabase as Mock).mockResolvedValue(mockDb);
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    global.fetch = originalFetch;
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
        expiresAt: new Date(Date.now() + 3600000),
      };

      mockCollection.findOne.mockResolvedValue(cachedData);

      const result = await getExchangeRate("SAR", "USD");

      expect(result.rate).toBe(0.2667);
      expect(result.source).toBe("cached");
    });

    it("should fetch live rate when cache miss", async () => {
      vi.stubEnv("EXCHANGE_RATE_API_KEY", "test-api-key");
      mockCollection.findOne.mockResolvedValue(null); // No cache
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            result: "success",
            conversion_rates: { USD: 0.2670, EUR: 0.2460 },
          }),
      });
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await getExchangeRate("SAR", "USD");

      // Rate should be from the live API response
      expect(result.rate).toBeCloseTo(0.267, 2);
      expect(result.source).toBe("live");
    });

    it("should use fallback when API unavailable", async () => {
      mockCollection.findOne.mockResolvedValue(null);
      (global.fetch as Mock).mockRejectedValue(new Error("Network error"));

      const result = await getExchangeRate("SAR", "USD");

      expect(result.rate).toBeDefined();
      expect(result.source).toBe("fallback");
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

      const result = await convertCurrency(100, "SAR", "USD");

      expect(result.fromAmount).toBe(100);
      expect(result.fromCurrency).toBe("SAR");
      expect(result.toAmount).toBe(26.67);
      expect(result.toCurrency).toBe("USD");
    });

    it("should handle same currency conversion", async () => {
      const result = await convertCurrency(100, "SAR", "SAR");

      expect(result.toAmount).toBe(100);
      expect(result.rate).toBe(1);
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
      expect(result.rates.USD).toBe(0.2667);
      expect(result.rates.EUR).toBe(0.2453);
      expect(result.rates.GBP).toBe(0.2107);
      expect(result.source).toBe("cached");
    });

    it("should fetch and return live rates when no cache", async () => {
      vi.stubEnv("EXCHANGE_RATE_API_KEY", "test-api-key");
      mockCollection.findOne.mockResolvedValue(null);
      (global.fetch as Mock).mockResolvedValue({
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
    beforeEach(() => {
      vi.stubEnv("EXCHANGE_RATE_API_KEY", "test-api-key");
    });

    it("should update cache when API returns success", async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            result: "success",
            conversion_rates: { USD: 0.2670, EUR: 0.2460 },
          }),
      });
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // refreshRates takes an array of currencies and returns { refreshed, failed }
      const result = await refreshRates(["SAR"]);

      expect(result.refreshed).toContain("SAR");
      expect(result.failed).toHaveLength(0);
    });

    it("should return currency in failed when API fails", async () => {
      (global.fetch as Mock).mockRejectedValue(new Error("API Error"));

      const result = await refreshRates(["SAR"]);

      expect(result.refreshed).toHaveLength(0);
      expect(result.failed).toContain("SAR");
    });

    it("should handle multiple currencies", async () => {
      vi.stubEnv("EXCHANGE_RATE_API_KEY", "test-api-key");

      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            result: "success",
            conversion_rates: { USD: 0.2670, EUR: 0.2460 },
          }),
      });
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await refreshRates(["SAR", "USD"]);

      expect(result.refreshed).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });
  });

  describe("Service exports", () => {
    it("should export all required functions", async () => {
      const serviceModule = await import("@/services/finance/currency-service");

      expect(typeof serviceModule.getExchangeRate).toBe("function");
      expect(typeof serviceModule.convertCurrency).toBe("function");
      expect(typeof serviceModule.getAllRates).toBe("function");
      expect(typeof serviceModule.refreshRates).toBe("function");
    });
  });
});
