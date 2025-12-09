/**
 * Health Endpoint Tests
 *
 * Tests for /api/health/ready and /api/health/live endpoints.
 * Uses vi.resetModules() + vi.doMock() pattern for proper isolation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Default mocks for happy path
vi.mock("@/lib/mongo", () => ({
  db: Promise.resolve({
    command: vi.fn().mockResolvedValue({ ok: 1 }),
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
      const { GET: getReady } = await import("@/app/api/health/ready/route");
      const response = await getReady();
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

      const { GET: getReadyFresh } = await import("@/app/api/health/ready/route");
      const response = await getReadyFresh();
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

      const { GET: getReadyFresh } = await import("@/app/api/health/ready/route");
      const response = await getReadyFresh();
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

      const { GET: getReadyFresh } = await import("@/app/api/health/ready/route");
      const response = await getReadyFresh();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ready).toBe(true);
      expect(json.checks.mongodb).toBe("ok");
      expect(json.checks.redis).toBe("ok");
      expect(json.requiresRedis).toBe(true);
    });
  });
});
