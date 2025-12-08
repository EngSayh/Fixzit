/**
 * Health Endpoint Tests
 *
 * Covers /api/health/ready and /api/health/live endpoints.
 * Uses fresh module loads with vi.resetModules to ensure mock isolation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalEnv = { ...process.env };

const mockDependencies = ({
  mongoOk = true,
  redisConfigured = false,
  redisOk = true,
}: {
  mongoOk?: boolean;
  redisConfigured?: boolean;
  redisOk?: boolean;
}) => {
  vi.doMock("@/lib/mongo", () => ({
    db: Promise.resolve({
      command: mongoOk
        ? vi.fn().mockResolvedValue({ ok: 1 })
        : vi.fn().mockRejectedValue(new Error("Connection refused")),
    }),
  }));

  vi.doMock("@/lib/redis", () => ({
    getRedisClient: vi.fn(() => {
      if (!redisConfigured) return null;
      return {
        ping: redisOk ? vi.fn().mockResolvedValue("PONG") : vi.fn().mockRejectedValue(new Error("Redis down")),
      };
    }),
  }));

  vi.doMock("@/lib/resilience", () => ({
    withTimeout: vi.fn(async (fn: (signal: AbortSignal) => Promise<unknown>) => {
      const controller = new AbortController();
      return fn(controller.signal);
    }),
  }));

  vi.doMock("@/lib/logger", () => ({
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  }));
};

const loadLive = async () => {
  const module = await import("@/app/api/health/live/route");
  return module.GET;
};

const loadReady = async () => {
  const module = await import("@/app/api/health/ready/route");
  return module.GET;
};

describe("Health Endpoints", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  describe("GET /api/health/live", () => {
    it("returns 200 with alive status", async () => {
      mockDependencies({});
      const getLive = await loadLive();
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
      mockDependencies({});
      const getReady = await loadReady();
      const response = await getReady();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ready).toBe(true);
      expect(json.checks.mongodb).toBe("ok");
      expect(json.checks.redis).toBe("disabled");
      expect(json.timestamp).toBeDefined();
    });

    it("returns 503 when MongoDB is unavailable", async () => {
      mockDependencies({ mongoOk: false });
      const getReady = await loadReady();
      const response = await getReady();
      const json = await response.json();

      expect(response.status).toBe(503);
      expect(json.ready).toBe(false);
      expect(json.checks.mongodb === "error" || json.checks.mongodb === "timeout").toBeTruthy();
    });

    it("returns 503 when Redis is configured but failing", async () => {
      process.env.REDIS_URL = "redis://localhost:6379";
      mockDependencies({ redisConfigured: true, redisOk: false });
      const getReady = await loadReady();
      const response = await getReady();
      const json = await response.json();

      expect(response.status).toBe(503);
      expect(json.ready).toBe(false);
      expect(json.checks.redis === "error" || json.checks.redis === "timeout").toBeTruthy();
      expect(json.requiresRedis).toBe(true);
    });
  });
});
