/**
 * Health Endpoint Tests
 *
 * Tests for /api/health/ready and /api/health/live endpoints.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET as getLive } from "@/app/api/health/live/route";
import { GET as getReady } from "@/app/api/health/ready/route";

// Mock dependencies
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
  });

  describe("GET /api/health/live", () => {
    it("returns 200 with alive status", async () => {
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
    it("returns 200 when MongoDB is healthy", async () => {
      const response = await getReady();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ready).toBe(true);
      expect(json.checks.mongodb).toBe("ok");
      expect(json.checks.redis).toBe("disabled"); // No Redis configured
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
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      }));

      const { GET } = await import("@/app/api/health/ready/route");
      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(503);
      expect(json.ready).toBe(false);
      expect(json.checks.mongodb === "error" || json.checks.mongodb === "timeout").toBe(true);
    });
  });
});
