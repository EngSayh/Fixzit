/**
 * @fileoverview Tests for SWR Cache Service
 * @module tests/lib/cache/swr-cache
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  SwrCache,
  getSwrCacheMetrics,
  resetSwrCacheMetrics,
} from "@/lib/cache/swr-cache";

// Mock Redis client
const mockRedisClient = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  scanStream: vi.fn(),
};

vi.mock("@/lib/redis", () => ({
  getRedisClient: () => mockRedisClient,
  CacheTTL: {
    FIVE_MINUTES: 300,
    FIFTEEN_MINUTES: 900,
    ONE_HOUR: 3600,
    ONE_DAY: 86400,
    ONE_WEEK: 604800,
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("SwrCache", () => {
  let cache: SwrCache;

  beforeEach(() => {
    vi.clearAllMocks();
    resetSwrCacheMetrics();
    cache = new SwrCache("test", {
      staleTime: 60,
      maxAge: 300,
      debug: false,
      dedupe: true,
    });
  });

  afterEach(() => {
    cache.resetMetrics();
  });

  describe("cache miss", () => {
    it("should fetch and cache on miss", async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setex.mockResolvedValue("OK");

      const fetcher = vi.fn().mockResolvedValue({ id: 1, name: "Test" });

      const result = await cache.get("item:1", fetcher);

      expect(result.data).toEqual({ id: 1, name: "Test" });
      expect(result.fromCache).toBe(false);
      expect(result.stale).toBe(false);
      expect(result.revalidating).toBe(false);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.setex).toHaveBeenCalled();
    });

    it("should increment miss counter", async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setex.mockResolvedValue("OK");

      await cache.get("item:1", async () => ({ id: 1 }));

      const metrics = cache.getMetrics();
      expect(metrics.misses).toBe(1);
      expect(metrics.hits).toBe(0);
    });
  });

  describe("cache hit (fresh)", () => {
    it("should return fresh cached data", async () => {
      const cachedEntry = {
        data: { id: 1, name: "Cached" },
        cachedAt: Date.now(),
        staleTime: 60,
        maxAge: 300,
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedEntry));

      const fetcher = vi.fn().mockResolvedValue({ id: 1, name: "Fresh" });

      const result = await cache.get("item:1", fetcher);

      expect(result.data).toEqual({ id: 1, name: "Cached" });
      expect(result.fromCache).toBe(true);
      expect(result.stale).toBe(false);
      expect(result.revalidating).toBe(false);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it("should increment hit counter", async () => {
      const cachedEntry = {
        data: { id: 1 },
        cachedAt: Date.now(),
        staleTime: 60,
        maxAge: 300,
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedEntry));

      await cache.get("item:1", async () => ({ id: 1 }));

      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(0);
    });
  });

  describe("cache hit (stale)", () => {
    it("should return stale data and trigger revalidation", async () => {
      const cachedEntry = {
        data: { id: 1, name: "Stale" },
        cachedAt: Date.now() - 120 * 1000, // 2 minutes ago (stale after 60s)
        staleTime: 60,
        maxAge: 300,
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedEntry));
      mockRedisClient.setex.mockResolvedValue("OK");

      const fetcher = vi.fn().mockResolvedValue({ id: 1, name: "Fresh" });

      const result = await cache.get("item:1", fetcher);

      expect(result.data).toEqual({ id: 1, name: "Stale" });
      expect(result.fromCache).toBe(true);
      expect(result.stale).toBe(true);
      expect(result.revalidating).toBe(true);

      // Wait for background revalidation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("should increment stale hit counter", async () => {
      const cachedEntry = {
        data: { id: 1 },
        cachedAt: Date.now() - 120 * 1000,
        staleTime: 60,
        maxAge: 300,
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedEntry));
      mockRedisClient.setex.mockResolvedValue("OK");

      await cache.get("item:1", async () => ({ id: 1 }));

      const metrics = cache.getMetrics();
      expect(metrics.staleHits).toBe(1);
    });
  });

  describe("cache expired", () => {
    it("should fetch fresh data when entry is expired", async () => {
      const cachedEntry = {
        data: { id: 1, name: "Expired" },
        cachedAt: Date.now() - 600 * 1000, // 10 minutes ago (expired after 300s)
        staleTime: 60,
        maxAge: 300,
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedEntry));
      mockRedisClient.setex.mockResolvedValue("OK");

      const fetcher = vi.fn().mockResolvedValue({ id: 1, name: "Fresh" });

      const result = await cache.get("item:1", fetcher);

      expect(result.data).toEqual({ id: 1, name: "Fresh" });
      expect(result.fromCache).toBe(false);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe("invalidation", () => {
    it("should invalidate a single key", async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await cache.invalidate("item:1");

      expect(mockRedisClient.del).toHaveBeenCalledWith("swr:test:item:1");
    });

    it("should invalidate all keys in namespace", async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield ["swr:test:item:1", "swr:test:item:2"];
        },
      };

      mockRedisClient.scanStream.mockReturnValue(mockStream);
      mockRedisClient.del.mockResolvedValue(2);

      await cache.invalidateAll();

      expect(mockRedisClient.scanStream).toHaveBeenCalled();
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        "swr:test:item:1",
        "swr:test:item:2"
      );
    });
  });

  describe("error handling", () => {
    it("should fallback to direct fetch on cache error", async () => {
      mockRedisClient.get.mockRejectedValue(new Error("Redis error"));

      const fetcher = vi.fn().mockResolvedValue({ id: 1, name: "Fallback" });

      const result = await cache.get("item:1", fetcher);

      expect(result.data).toEqual({ id: 1, name: "Fallback" });
      expect(result.fromCache).toBe(false);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("should increment error counter on cache failure", async () => {
      mockRedisClient.get.mockRejectedValue(new Error("Redis error"));

      await cache.get("item:1", async () => ({ id: 1 }));

      const metrics = cache.getMetrics();
      expect(metrics.errors).toBe(1);
    });
  });

  describe("deduplication", () => {
    it("should deduplicate concurrent requests for same key", async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setex.mockResolvedValue("OK");

      let callCount = 0;
      const fetcher = vi.fn().mockImplementation(async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { id: 1, callNumber: callCount };
      });

      // Start two concurrent requests
      const [result1, result2] = await Promise.all([
        cache.get("item:1", fetcher),
        cache.get("item:1", fetcher),
      ]);

      // Should only fetch once
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(result1.data).toEqual(result2.data);
    });
  });

  describe("metrics", () => {
    it("should track instance metrics correctly", async () => {
      mockRedisClient.get
        .mockResolvedValueOnce(null) // miss
        .mockResolvedValueOnce(
          JSON.stringify({
            data: { id: 1 },
            cachedAt: Date.now(),
            staleTime: 60,
            maxAge: 300,
          })
        ); // hit

      mockRedisClient.setex.mockResolvedValue("OK");

      await cache.get("item:1", async () => ({ id: 1 }));
      await cache.get("item:2", async () => ({ id: 2 }));

      const metrics = cache.getMetrics();
      expect(metrics.misses).toBe(1);
      expect(metrics.hits).toBe(1);
    });

    it("should track global metrics", async () => {
      const cache1 = new SwrCache("ns1");
      const cache2 = new SwrCache("ns2");

      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setex.mockResolvedValue("OK");

      await cache1.get("item:1", async () => ({ id: 1 }));
      await cache2.get("item:2", async () => ({ id: 2 }));

      const globalMetrics = getSwrCacheMetrics();
      expect(globalMetrics.misses).toBe(2);
    });

    it("should reset metrics", () => {
      cache.resetMetrics();
      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
    });
  });

  describe("custom options per request", () => {
    it("should allow overriding staleTime per request", async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setex.mockResolvedValue("OK");

      await cache.get("item:1", async () => ({ id: 1 }), { staleTime: 30 });

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.stringContaining('"staleTime":30')
      );
    });

    it("should allow overriding maxAge per request", async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setex.mockResolvedValue("OK");

      await cache.get("item:1", async () => ({ id: 1 }), { maxAge: 600 });

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.any(String),
        600,
        expect.any(String)
      );
    });
  });
});
