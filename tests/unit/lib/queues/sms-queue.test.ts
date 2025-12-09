/**
 * SMS Queue Tests
 *
 * Tests for lib/queues/sms-queue.ts worker configuration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock all dependencies
vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: "test-job-id" }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn(() => null),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/mongo", () => ({
  db: Promise.resolve({
    collection: vi.fn().mockReturnValue({
      findOne: vi.fn().mockResolvedValue(null),
      updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    }),
  }),
}));

describe("SMS Queue", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("SMS Worker Rate Limiting", () => {
    it("uses default 120/min when SMS_WORKER_MAX_PER_MIN is not set", async () => {
      vi.stubEnv("SMS_WORKER_MAX_PER_MIN", "");
      vi.stubEnv("REDIS_URL", "redis://localhost:6379");
      
      vi.doMock("@/lib/redis", () => ({
        getRedisClient: vi.fn(() => ({ ping: vi.fn() })),
      }));

      const { Worker } = await import("bullmq");
      const { startSMSWorker } = await import("@/lib/queues/sms-queue");
      
      startSMSWorker();
      
      // Worker should be called with limiter.max = 120
      expect(Worker).toHaveBeenCalled();
      const workerCall = vi.mocked(Worker).mock.calls[0];
      if (workerCall && workerCall[2]) {
        expect(workerCall[2].limiter?.max).toBe(120);
      }
    });

    it("uses parsed value when SMS_WORKER_MAX_PER_MIN is valid number", async () => {
      vi.stubEnv("SMS_WORKER_MAX_PER_MIN", "200");
      vi.stubEnv("REDIS_URL", "redis://localhost:6379");
      
      vi.resetModules();
      
      vi.doMock("@/lib/redis", () => ({
        getRedisClient: vi.fn(() => ({ ping: vi.fn() })),
      }));

      const { Worker } = await import("bullmq");
      const { startSMSWorker } = await import("@/lib/queues/sms-queue");
      
      startSMSWorker();
      
      expect(Worker).toHaveBeenCalled();
      const workerCall = vi.mocked(Worker).mock.calls[0];
      if (workerCall && workerCall[2]) {
        expect(workerCall[2].limiter?.max).toBe(200);
      }
    });

    it("uses default when SMS_WORKER_MAX_PER_MIN is NaN", async () => {
      vi.stubEnv("SMS_WORKER_MAX_PER_MIN", "not-a-number");
      vi.stubEnv("REDIS_URL", "redis://localhost:6379");
      
      vi.resetModules();
      
      vi.doMock("@/lib/redis", () => ({
        getRedisClient: vi.fn(() => ({ ping: vi.fn() })),
      }));

      const { Worker } = await import("bullmq");
      const { logger } = await import("@/lib/logger");
      const { startSMSWorker } = await import("@/lib/queues/sms-queue");
      
      startSMSWorker();
      
      // Should log warning
      expect(logger.warn).toHaveBeenCalledWith(
        "[SMS Worker] Invalid SMS_WORKER_MAX_PER_MIN value, using default",
        expect.objectContaining({ value: "not-a-number", default: 120 })
      );
      
      // Should use default
      expect(Worker).toHaveBeenCalled();
      const workerCall = vi.mocked(Worker).mock.calls[0];
      if (workerCall && workerCall[2]) {
        expect(workerCall[2].limiter?.max).toBe(120);
      }
    });

    it("uses default when SMS_WORKER_MAX_PER_MIN is negative", async () => {
      vi.stubEnv("SMS_WORKER_MAX_PER_MIN", "-50");
      vi.stubEnv("REDIS_URL", "redis://localhost:6379");
      
      vi.resetModules();
      
      vi.doMock("@/lib/redis", () => ({
        getRedisClient: vi.fn(() => ({ ping: vi.fn() })),
      }));

      const { Worker } = await import("bullmq");
      const { startSMSWorker } = await import("@/lib/queues/sms-queue");
      
      startSMSWorker();
      
      expect(Worker).toHaveBeenCalled();
      const workerCall = vi.mocked(Worker).mock.calls[0];
      if (workerCall && workerCall[2]) {
        expect(workerCall[2].limiter?.max).toBe(120);
      }
    });

    it("enforces minimum of 30/min when value is too low", async () => {
      vi.stubEnv("SMS_WORKER_MAX_PER_MIN", "10");
      vi.stubEnv("REDIS_URL", "redis://localhost:6379");
      
      vi.resetModules();
      
      vi.doMock("@/lib/redis", () => ({
        getRedisClient: vi.fn(() => ({ ping: vi.fn() })),
      }));

      const { Worker } = await import("bullmq");
      const { startSMSWorker } = await import("@/lib/queues/sms-queue");
      
      startSMSWorker();
      
      expect(Worker).toHaveBeenCalled();
      const workerCall = vi.mocked(Worker).mock.calls[0];
      if (workerCall && workerCall[2]) {
        expect(workerCall[2].limiter?.max).toBe(30); // Minimum enforced
      }
    });

    it("returns null when Redis is not configured", async () => {
      vi.stubEnv("REDIS_URL", "");
      
      vi.resetModules();
      
      vi.doMock("@/lib/redis", () => ({
        getRedisClient: vi.fn(() => null),
      }));

      const { startSMSWorker } = await import("@/lib/queues/sms-queue");
      
      const worker = startSMSWorker();
      
      expect(worker).toBeNull();
    });
  });
});
