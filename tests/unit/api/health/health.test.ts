/**
 * Health Endpoint Tests
 *
 * Tests for /api/health/ready and /api/health/live endpoints.
 * Uses vi.resetModules() + vi.doMock() pattern for proper isolation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Default mocks for happy path
vi.mock("@/lib/mongo", () => ({
  db: Promise.resolve({
    command: vi.fn().mockResolvedValue({ ok: 1 }),
  }),
  pingDatabase: vi.fn().mockResolvedValue({
    ok: true,
    latencyMs: 5,
  }),
}));

vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn(() => null),
}));

vi.mock("@/lib/resilience", () => ({
  withTimeout: vi.fn(async (fn: (signal: AbortSignal) => Promise<unknown>) => {
    const controller = new AbortController();
    return fn(controller.signal);
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock rate limiting to always pass
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
  rateLimit: vi.fn().mockReturnValue(null),
}));

// Helper to create mock request
function createMockRequest(url = "http://localhost:3000/api/health/ready") {
  return new NextRequest(url);
}

describe("Health Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("GET /api/health/live", () => {
    it("returns 200 with alive status", async () => {
      const { GET: getLive } = await import("@/app/api/health/live/route");
      const response = await getLive();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.alive).toBe(true);
      expect(json.uptime).toBeGreaterThanOrEqual(0);
      expect(json.memory).toBeDefined();
      expect(json.memory.heapUsed).toBeGreaterThan(0);
      expect(json.timestamp).toBeDefined();
    });
  });

  describe("GET /api/health/ready", () => {
    it("returns 200 when MongoDB is healthy and Redis not configured", async () => {
      vi.resetModules();
      
      vi.doMock("@/lib/mongo", () => ({
        db: Promise.resolve({
          command: vi.fn().mockResolvedValue({ ok: 1 }),
        }),
        pingDatabase: vi.fn().mockResolvedValue({
          ok: true,
          latencyMs: 5,
        }),
      }));

      vi.doMock("@/lib/redis", () => ({
        getRedisClient: vi.fn(() => null),
      }));

      vi.doMock("@/lib/resilience", () => ({
        withTimeout: vi.fn(async (fn: (signal: AbortSignal) => Promise<unknown>) => {
          const controller = new AbortController();
          return fn(controller.signal);
        }),
      }));

      vi.doMock("@/lib/logger", () => ({
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      }));

      vi.doMock("@/lib/middleware/rate-limit", () => ({
        enforceRateLimit: vi.fn().mockReturnValue(null),
        rateLimit: vi.fn().mockReturnValue(null),
      }));

      const { GET: getReady } = await import("@/app/api/health/ready/route");
      const response = await getReady(createMockRequest());
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ready).toBe(true);
      expect(json.checks.mongodb).toBe("ok");
      expect(json.checks.redis).toBe("disabled");
      expect(json.timestamp).toBeDefined();
    });

    it("returns 503 when MongoDB is unavailable", async () => {
      vi.resetModules();
      
      vi.doMock("@/lib/mongo", () => ({
        db: Promise.resolve({
          command: vi.fn().mockRejectedValue(new Error("Connection refused")),
        }),
        pingDatabase: vi.fn().mockResolvedValue({
          ok: false,
          latencyMs: 3000,
          error: "Connection refused",
        }),
      }));

      vi.doMock("@/lib/redis", () => ({
        getRedisClient: vi.fn(() => null),
      }));

      vi.doMock("@/lib/resilience", () => ({
        withTimeout: vi.fn(async (fn: (signal: AbortSignal) => Promise<unknown>) => {
          const controller = new AbortController();
          return fn(controller.signal);
        }),
      }));

      vi.doMock("@/lib/logger", () => ({
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      }));

      vi.doMock("@/lib/middleware/rate-limit", () => ({
        enforceRateLimit: vi.fn().mockReturnValue(null),
        rateLimit: vi.fn().mockReturnValue(null),
      }));

      const { GET: getReadyFresh } = await import("@/app/api/health/ready/route");
      const response = await getReadyFresh(createMockRequest());
      const json = await response.json();

      expect(response.status).toBe(503);
      expect(json.ready).toBe(false);
      expect(json.checks.mongodb).not.toBe("ok");
      expect(json.timestamp).toBeDefined();
    });

    it("returns 503 when Redis is configured but unavailable", async () => {
      vi.resetModules();
      vi.stubEnv("REDIS_URL", "redis://localhost:6379");
      
      vi.doMock("@/lib/mongo", () => ({
        db: Promise.resolve({
          command: vi.fn().mockResolvedValue({ ok: 1 }),
        }),
        pingDatabase: vi.fn().mockResolvedValue({
          ok: true,
          latencyMs: 5,
        }),
      }));

      vi.doMock("@/lib/redis", () => ({
        getRedisClient: vi.fn(() => ({
          ping: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
        })),
      }));

      vi.doMock("@/lib/resilience", () => ({
        withTimeout: vi.fn(async (fn: (signal: AbortSignal) => Promise<unknown>) => {
          const controller = new AbortController();
          return fn(controller.signal);
        }),
      }));

      vi.doMock("@/lib/logger", () => ({
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      }));

      vi.doMock("@/lib/middleware/rate-limit", () => ({
        enforceRateLimit: vi.fn().mockReturnValue(null),
        rateLimit: vi.fn().mockReturnValue(null),
      }));

      const { GET: getReadyFresh } = await import("@/app/api/health/ready/route");
      const response = await getReadyFresh(createMockRequest());
      const json = await response.json();

      expect(response.status).toBe(503);
      expect(json.ready).toBe(false);
      expect(json.checks.mongodb).toBe("ok");
      expect(json.checks.redis).toBe("error");
      expect(json.requiresRedis).toBe(true);
    });

    it("returns 200 when both MongoDB and Redis are healthy", async () => {
      vi.resetModules();
      vi.stubEnv("REDIS_URL", "redis://localhost:6379");
      
      vi.doMock("@/lib/mongo", () => ({
        db: Promise.resolve({
          command: vi.fn().mockResolvedValue({ ok: 1 }),
        }),
        pingDatabase: vi.fn().mockResolvedValue({
          ok: true,
          latencyMs: 5,
        }),
      }));

      vi.doMock("@/lib/redis", () => ({
        getRedisClient: vi.fn(() => ({
          ping: vi.fn().mockResolvedValue("PONG"),
        })),
      }));

      vi.doMock("@/lib/resilience", () => ({
        withTimeout: vi.fn(async (fn: (signal: AbortSignal) => Promise<unknown>) => {
          const controller = new AbortController();
          return fn(controller.signal);
        }),
      }));

      vi.doMock("@/lib/logger", () => ({
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      }));

      vi.doMock("@/lib/middleware/rate-limit", () => ({
        enforceRateLimit: vi.fn().mockReturnValue(null),
        rateLimit: vi.fn().mockReturnValue(null),
      }));

      const { GET: getReadyFresh } = await import("@/app/api/health/ready/route");
      const response = await getReadyFresh(createMockRequest());
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ready).toBe(true);
      expect(json.checks.mongodb).toBe("ok");
      expect(json.checks.redis).toBe("ok");
      expect(json.requiresRedis).toBe(true);
    });
  });
});
