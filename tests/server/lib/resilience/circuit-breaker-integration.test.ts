/**
 * Circuit Breaker Integration Tests
 * 
 * Tests the circuit breaker pattern integration with SMS and Email providers.
 * Validates isOpen(), getState(), and provider selection logic.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CircuitBreaker } from "@/lib/resilience/circuit-breaker";

describe("CircuitBreaker", () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers(); // Reset any fake timers from other tests
    breaker = new CircuitBreaker({
      name: "test-breaker",
      failureThreshold: 3,
      successThreshold: 2,
      cooldownMs: 100, // Short cooldown for testing
    });
  });

  describe("isOpen()", () => {
    it("should return false when breaker is closed", () => {
      expect(breaker.isOpen()).toBe(false);
      expect(breaker.getState()).toBe("closed");
    });

    it("should return true after failure threshold reached", async () => {
      // Cause failures to open the breaker
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.run(async () => {
            throw new Error("Test failure");
          });
        } catch {
          // Expected
        }
      }

      expect(breaker.isOpen()).toBe(true);
      expect(breaker.getState()).toBe("open");
    });

    it("should return false after cooldown expires", async () => {
      // Use fake timers for this test to avoid CI timeout issues
      vi.useFakeTimers();

      // Create fresh breaker with fake timers active
      const testBreaker = new CircuitBreaker({
        name: "cooldown-test-breaker",
        failureThreshold: 3,
        successThreshold: 2,
        cooldownMs: 100,
      });

      // Open the breaker by recording failures synchronously
      // Use recordFailure directly to avoid async operations with fake timers
      testBreaker.recordFailure();
      testBreaker.recordFailure();
      testBreaker.recordFailure();

      expect(testBreaker.isOpen()).toBe(true);

      // Advance time past cooldown using fake timers
      vi.advanceTimersByTime(150);

      // Should be ready to try again (half-open)
      expect(testBreaker.isOpen()).toBe(false);
      
      // Restore real timers
      vi.useRealTimers();
    }, 5000); // 5 second timeout
  });

  describe("getState()", () => {
    it("should start in closed state", () => {
      expect(breaker.getState()).toBe("closed");
    });

    it("should transition to open after failures", async () => {
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.run(async () => {
            throw new Error("Test failure");
          });
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe("open");
    });
  });

  describe("run()", () => {
    it("should execute operation when closed", async () => {
      const result = await breaker.run(async () => "success");
      expect(result).toBe("success");
    });

    it("should throw CircuitBreakerOpenError when open", async () => {
      // Open the breaker
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.run(async () => {
            throw new Error("Test failure");
          });
        } catch {
          // Expected
        }
      }

      // Should throw immediately without executing
      await expect(breaker.run(async () => "should not run")).rejects.toThrow(
        /Circuit breaker "test-breaker" is open/
      );
    });
  });
});

describe("Service Circuit Breakers", () => {
  it("should have all expected breakers configured", async () => {
    const { serviceCircuitBreakers } = await import(
      "@/lib/resilience/service-circuit-breakers"
    );

    // Only Taqnyat is supported for SMS (CITC-compliant for Saudi Arabia)
    expect(serviceCircuitBreakers).toHaveProperty("taqnyat");
    expect(serviceCircuitBreakers).toHaveProperty("sendgrid");
    expect(serviceCircuitBreakers).toHaveProperty("tap");
    expect(serviceCircuitBreakers).toHaveProperty("meilisearch");
    expect(serviceCircuitBreakers).toHaveProperty("zatca");
  });

  it("should return breaker instances with isOpen method", async () => {
    const { getCircuitBreaker } = await import(
      "@/lib/resilience/service-circuit-breakers"
    );

    const taqnyatBreaker = getCircuitBreaker("taqnyat");
    expect(typeof taqnyatBreaker.isOpen).toBe("function");
    expect(typeof taqnyatBreaker.getState).toBe("function");
    expect(typeof taqnyatBreaker.run).toBe("function");
  });
});
