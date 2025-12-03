import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn(() => null),
}));

import { getRedisClient } from "@/lib/redis";
import { logger } from "@/lib/logger";
import {
  rateLimit,
  redisRateLimit,
  __resetRateLimitStateForTests,
} from "@/server/security/rateLimit";

describe("rateLimit helper", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetRateLimitStateForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit and blocks subsequent calls", () => {
    const key = "rate:test";
    const first = rateLimit(key, 3, 1_000);
    const second = rateLimit(key, 3, 1_000);
    const third = rateLimit(key, 3, 1_000);
    const fourth = rateLimit(key, 3, 1_000);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(true);
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
  });

  it("resets the window after the configured duration", () => {
    const key = "rate:window";
    rateLimit(key, 2, 500);
    rateLimit(key, 2, 500);

    const blocked = rateLimit(key, 2, 500);
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(501);

    const afterReset = rateLimit(key, 2, 500);
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(1);
  });

  it("isolates counters per key", () => {
    const alpha = rateLimit("rate:alpha", 1, 1_000);
    const beta = rateLimit("rate:beta", 1, 1_000);

    expect(alpha.allowed).toBe(true);
    expect(beta.allowed).toBe(true);

    const alphaBlocked = rateLimit("rate:alpha", 1, 1_000);
    const betaStillAllowed = rateLimit("rate:beta", 1, 1_000);

    expect(alphaBlocked.allowed).toBe(false);
    expect(betaStillAllowed.allowed).toBe(false); // beta hit its own limit separately
  });

  it("falls back to in-memory without log spam when Redis is unavailable", async () => {
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const mockedGetRedisClient = vi.mocked(getRedisClient);
    mockedGetRedisClient.mockReturnValue(null as unknown as ReturnType<typeof getRedisClient>);

    const key = "rate:redisless";
    const first = await redisRateLimit(key, 2, 1_000);
    const second = await redisRateLimit(key, 2, 1_000);
    const third = await redisRateLimit(key, 2, 1_000);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });
});
