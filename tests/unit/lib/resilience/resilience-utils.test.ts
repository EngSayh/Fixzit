import { afterEach, describe, expect, it, vi } from "vitest";

import { resetTestMocks } from "@/tests/helpers/mockDefaults";

import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  executeWithRetry,
  withTimeout,
} from "@/lib/resilience";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});

describe("executeWithRetry", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries transient failures before succeeding", async () => {
    vi.useFakeTimers();
    const operation = vi
      .fn<[], Promise<string>>()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValue("ok");

    const promise = executeWithRetry(async () => operation(), {
      maxAttempts: 2,
      baseDelayMs: 10,
    });

    const expectation = expect(promise).resolves.toBe("ok");
    await vi.runAllTimersAsync();
    await expectation;
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting attempts", async () => {
    vi.useFakeTimers();
    const error = new Error("permanent");
    const operation = vi.fn().mockRejectedValue(error);

    const promise = executeWithRetry(() => operation(), {
      maxAttempts: 2,
      baseDelayMs: 5,
      label: "test-operation",
    });

    const expectation = expect(promise).rejects.toBe(error);
    await vi.runAllTimersAsync();
    await expectation;
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

describe("withTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects when the operation exceeds the timeout", async () => {
    vi.useFakeTimers();
    const promise = withTimeout(
      () =>
        new Promise<never>(() => {
          /* never resolves */
        }),
      { timeoutMs: 50 },
    );

    const expectation = expect(promise).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(51);
    await expectation;
  });
});

describe("CircuitBreaker", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens after repeated failures and recovers after cooldown", async () => {
    vi.useFakeTimers();
    const breaker = new CircuitBreaker({
      name: "test",
      failureThreshold: 1,
      cooldownMs: 1000,
      successThreshold: 1,
    });

    await expect(
      breaker.run(() => Promise.reject(new Error("boom"))),
    ).rejects.toThrow("boom");

    await expect(
      breaker.run(() => Promise.resolve("should block")),
    ).rejects.toBeInstanceOf(CircuitBreakerOpenError);

    await vi.advanceTimersByTimeAsync(1000);

    await expect(breaker.run(() => Promise.resolve("ok"))).resolves.toBe("ok");
  });
});
