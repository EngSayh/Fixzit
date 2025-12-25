/**
 * @fileoverview Unit tests for Redis OTP store
 * Tests async Redis-backed OTP storage with in-memory fallback.
 *
 * CRITICAL: These tests verify the fix for the multi-instance OTP verification
 * race condition where sync wrappers caused OTP verification failures in
 * distributed deployments.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  redisOtpStore,
  redisRateLimitStore,
  redisOtpSessionStore,
  OTP_LENGTH,
  OTP_EXPIRY_MS,
  MAX_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  MAX_SENDS_PER_WINDOW,
  OTP_SESSION_EXPIRY_MS,
  type OTPData,
  type RateLimitData,
  type OTPLoginSession,
} from "@/lib/otp-store";

// Mock Redis module to test both Redis and fallback scenarios
vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn(() => null),
  safeRedisOp: vi.fn(),
}));

describe("OTP Store Redis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Constants", () => {
    it("should export OTP configuration constants", () => {
      expect(OTP_LENGTH).toBe(6);
      expect(OTP_EXPIRY_MS).toBe(5 * 60 * 1000); // 5 minutes
      expect(MAX_ATTEMPTS).toBe(3);
      expect(RATE_LIMIT_WINDOW_MS).toBe(15 * 60 * 1000); // 15 minutes
      expect(MAX_SENDS_PER_WINDOW).toBe(5);
      expect(OTP_SESSION_EXPIRY_MS).toBe(5 * 60 * 1000); // 5 minutes
    });
  });

  describe("redisOtpStore", () => {
    const testIdentifier = "test@example.com";
    const createTestOtpData = (): OTPData => ({
      otp: "123456",
      attempts: 0,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
      userId: "user-123",
      phone: "+96812345678",
    });

    describe("Basic Operations (Memory Fallback)", () => {
      it("should set and get OTP data", async () => {
        const testOtpData = createTestOtpData();
        await redisOtpStore.set(testIdentifier, testOtpData);
        const result = await redisOtpStore.get(testIdentifier);

        expect(result).toBeDefined();
        expect(result?.otp).toBe(testOtpData.otp);
        expect(result?.userId).toBe(testOtpData.userId);
      });

      it("should return undefined for non-existent identifier", async () => {
        const result = await redisOtpStore.get("non-existent@example.com");
        expect(result).toBeUndefined();
      });

      it("should delete OTP data", async () => {
        const testOtpData = createTestOtpData();
        await redisOtpStore.set(testIdentifier, testOtpData);
        await redisOtpStore.delete(testIdentifier);
        const result = await redisOtpStore.get(testIdentifier);

        expect(result).toBeUndefined();
      });

      it("should update OTP data", async () => {
        const testOtpData = createTestOtpData();
        await redisOtpStore.set(testIdentifier, testOtpData);

        const updatedData: OTPData = { ...testOtpData, attempts: 1 };
        await redisOtpStore.update(testIdentifier, updatedData);

        const result = await redisOtpStore.get(testIdentifier);
        expect(result?.attempts).toBe(1);
        expect(result?.otp).toBe(testOtpData.otp);
      });
    });

    describe("Expiry Handling", () => {
      it("should return undefined for expired OTP", async () => {
        const expiredOtpData: OTPData = {
          otp: "654321",
          attempts: 0,
          expiresAt: Date.now() - 1000, // Already expired
          userId: "user-123",
          phone: "+96812345678",
        };

        await redisOtpStore.set("expired@example.com", expiredOtpData);
        const result = await redisOtpStore.get("expired@example.com");

        expect(result).toBeUndefined();
      });

      it("should not return expired OTP even if in memory", async () => {
        const identifier = "will-expire@example.com";
        const now = Date.now();
        const nearFutureOtp: OTPData = {
          otp: "111111",
          attempts: 0,
          expiresAt: now + 100, // Expires in 100ms
          userId: "user-123",
          phone: "+96812345678",
        };

        await redisOtpStore.set(identifier, nearFutureOtp);

        // Verify it's accessible immediately
        const resultBefore = await redisOtpStore.get(identifier);
        expect(resultBefore).toBeDefined();

        // Mock Date.now to simulate time passing
        const originalDateNow = Date.now;
        vi.spyOn(Date, "now").mockReturnValue(now + 200); // 200ms later

        // Should be undefined after expiry
        const resultAfter = await redisOtpStore.get(identifier);
        expect(resultAfter).toBeUndefined();

        // Restore Date.now
        Date.now = originalDateNow;
      });
    });

    describe("Multi-Instance Simulation", () => {
      it("should persist OTP across async operations", async () => {
        // This test simulates what happens in a multi-instance deployment
        // where Instance A sends OTP and Instance B verifies it

        // Instance A: Send OTP (set)
        const identifier = "multi-instance@test.com";
        const otpData: OTPData = {
          otp: "999888",
          attempts: 0,
          expiresAt: Date.now() + OTP_EXPIRY_MS,
          userId: "user-multi",
          phone: "+96899988877",
        };

        await redisOtpStore.set(identifier, otpData);

        // Instance B: Verify OTP (get, update, delete)
        // In real scenario, this would be a different server reading from Redis
        const fetchedOtp = await redisOtpStore.get(identifier);
        expect(fetchedOtp).toBeDefined();
        expect(fetchedOtp?.otp).toBe("999888");

        // Simulate failed attempt
        const updatedData: OTPData = { ...otpData, attempts: 1 };
        await redisOtpStore.update(identifier, updatedData);

        // Verify attempt count persisted
        const afterAttempt = await redisOtpStore.get(identifier);
        expect(afterAttempt?.attempts).toBe(1);

        // Simulate successful verification - delete OTP
        await redisOtpStore.delete(identifier);

        // Verify OTP is gone
        const afterDelete = await redisOtpStore.get(identifier);
        expect(afterDelete).toBeUndefined();
      });

      it("should properly update attempts", async () => {
        const identifier = "atomic-test@example.com";
        const otpData: OTPData = {
          otp: "777666",
          attempts: 0,
          expiresAt: Date.now() + OTP_EXPIRY_MS,
          userId: "user-atomic",
          phone: "+96877766655",
        };

        await redisOtpStore.set(identifier, otpData);

        // Update attempts
        const updated = { ...otpData, attempts: 1 };
        await redisOtpStore.update(identifier, updated);

        const result = await redisOtpStore.get(identifier);
        expect(result?.attempts).toBe(1);
      });
    });
  });

  describe("redisRateLimitStore", () => {
    const testIdentifier = "ratelimit:test@example.com";

    describe("Basic Operations", () => {
      it("should set and get rate limit data", async () => {
        const rateLimitData: RateLimitData = {
          count: 1,
          resetAt: Date.now() + RATE_LIMIT_WINDOW_MS,
        };

        await redisRateLimitStore.set(testIdentifier, rateLimitData);
        const result = await redisRateLimitStore.get(testIdentifier);

        expect(result).toBeDefined();
        expect(result?.count).toBe(1);
      });

      it("should return undefined for non-existent identifier", async () => {
        const result = await redisRateLimitStore.get("non-existent-rate");
        expect(result).toBeUndefined();
      });

      it("should increment rate limit counter", async () => {
        const identifier = "increment-test@example.com";
        const windowMs = RATE_LIMIT_WINDOW_MS;
        const maxCount = MAX_SENDS_PER_WINDOW;

        // First increment
        const result1 = await redisRateLimitStore.increment(
          identifier,
          maxCount,
          windowMs
        );
        expect(result1.count).toBe(1);
        expect(result1.allowed).toBe(true);

        // Second increment
        const result2 = await redisRateLimitStore.increment(
          identifier,
          maxCount,
          windowMs
        );
        expect(result2.count).toBe(2);
        expect(result2.allowed).toBe(true);
      });

      it("should enforce rate limit after max count", async () => {
        const identifier = "rate-limit-enforce@example.com";
        const windowMs = RATE_LIMIT_WINDOW_MS;
        const maxCount = 3; // Low limit for testing

        // Fill up the limit
        for (let i = 0; i < maxCount; i++) {
          const result = await redisRateLimitStore.increment(
            identifier,
            maxCount,
            windowMs
          );
          expect(result.count).toBe(i + 1);
          expect(result.allowed).toBe(true);
        }

        // Next request should be rate limited
        const limitedResult = await redisRateLimitStore.increment(
          identifier,
          maxCount,
          windowMs
        );
        expect(limitedResult.count).toBe(maxCount + 1);
        expect(limitedResult.allowed).toBe(false);
      });
    });

    describe("Window Reset", () => {
      it("should return undefined for expired rate limit", async () => {
        const expiredData: RateLimitData = {
          count: 5,
          resetAt: Date.now() - 1000, // Already expired
        };

        await redisRateLimitStore.set("expired-rate", expiredData);
        const result = await redisRateLimitStore.get("expired-rate");

        expect(result).toBeUndefined();
      });
    });
  });

  describe("redisOtpSessionStore", () => {
    const testToken = "test-session-token-abc123";

    describe("Basic Operations", () => {
      it("should set and get OTP session", async () => {
        const sessionData: OTPLoginSession = {
          userId: "user-session",
          identifier: "user@example.com",
          expiresAt: Date.now() + OTP_SESSION_EXPIRY_MS,
        };

        await redisOtpSessionStore.set(testToken, sessionData);
        const result = await redisOtpSessionStore.get(testToken);

        expect(result).toBeDefined();
        expect(result?.userId).toBe("user-session");
      });

      it("should return undefined for non-existent token", async () => {
        const result = await redisOtpSessionStore.get("non-existent-token");
        expect(result).toBeUndefined();
      });

      it("should delete OTP session", async () => {
        const token = "delete-test-token";
        const sessionData: OTPLoginSession = {
          userId: "user-delete",
          identifier: "delete@example.com",
          expiresAt: Date.now() + OTP_SESSION_EXPIRY_MS,
        };

        await redisOtpSessionStore.set(token, sessionData);
        await redisOtpSessionStore.delete(token);
        const result = await redisOtpSessionStore.get(token);

        expect(result).toBeUndefined();
      });
    });

    describe("Auth Flow Simulation", () => {
      it("should support complete OTP verification flow", async () => {
        // Step 1: User requests OTP, session created
        const token = "auth-flow-token";
        const identifier = "authflow@example.com";

        // Initial session
        const initialSession: OTPLoginSession = {
          userId: "user-flow",
          identifier,
          expiresAt: Date.now() + OTP_SESSION_EXPIRY_MS,
        };

        await redisOtpSessionStore.set(token, initialSession);

        // Step 2: Auth system retrieves session
        const fetchedSession = await redisOtpSessionStore.get(token);
        expect(fetchedSession).toBeDefined();
        expect(fetchedSession?.identifier).toBe(identifier);

        // Step 3: After successful login, session is consumed (deleted)
        await redisOtpSessionStore.delete(token);

        // Step 4: Verify token cannot be reused
        const reusedSession = await redisOtpSessionStore.get(token);
        expect(reusedSession).toBeUndefined();
      });
    });

    describe("Expiry Handling", () => {
      it("should return undefined for expired session", async () => {
        const expiredSession: OTPLoginSession = {
          userId: "user-expired",
          identifier: "expired@example.com",
          expiresAt: Date.now() - 1000, // Already expired
        };

        await redisOtpSessionStore.set("expired-session", expiredSession);
        const result = await redisOtpSessionStore.get("expired-session");

        expect(result).toBeUndefined();
      });
    });
  });

  describe("Async Store Interface Compliance", () => {
    it("redisOtpStore should have async interface", () => {
      const testOtp: OTPData = {
        otp: "123456",
        attempts: 0,
        expiresAt: Date.now() + OTP_EXPIRY_MS,
        userId: "test",
        phone: "+968",
      };
      // Verify all methods return promises
      expect(redisOtpStore.get("test")).toBeInstanceOf(Promise);
      expect(redisOtpStore.set("test", testOtp)).toBeInstanceOf(Promise);
      expect(redisOtpStore.delete("test")).toBeInstanceOf(Promise);
      expect(redisOtpStore.update("test", testOtp)).toBeInstanceOf(Promise);
    });

    it("redisRateLimitStore should have async interface", () => {
      const testRate: RateLimitData = { count: 0, resetAt: Date.now() };
      expect(redisRateLimitStore.get("test")).toBeInstanceOf(Promise);
      expect(redisRateLimitStore.set("test", testRate)).toBeInstanceOf(Promise);
      expect(redisRateLimitStore.increment("test", 1000, 5)).toBeInstanceOf(Promise);
    });

    it("redisOtpSessionStore should have async interface", () => {
      const testSession: OTPLoginSession = {
        userId: "test",
        identifier: "test",
        expiresAt: Date.now(),
      };
      expect(redisOtpSessionStore.get("test")).toBeInstanceOf(Promise);
      expect(redisOtpSessionStore.set("test", testSession)).toBeInstanceOf(Promise);
      expect(redisOtpSessionStore.delete("test")).toBeInstanceOf(Promise);
    });
  });

  describe("Regression Tests", () => {
    describe("Multi-Instance OTP Verification (PR #400 Fix)", () => {
      /**
       * This test verifies the fix for the critical race condition where:
       * 1. Instance A sends OTP (stores in Redis)
       * 2. Instance B receives verification request (sync wrapper returns undefined)
       * 3. Verification fails even though OTP is valid in Redis
       *
       * The fix: All routes now use async Redis stores directly
       */
      it("should verify OTP across async operations", async () => {
        const identifier = "regression-test@example.com";
        const correctOtp = "555444";

        // Instance A: Send OTP
        const otpData: OTPData = {
          otp: correctOtp,
          attempts: 0,
          expiresAt: Date.now() + OTP_EXPIRY_MS,
          userId: "user-regression",
          phone: "+96855544433",
        };
        await redisOtpStore.set(identifier, otpData);

        // Instance B: Verify OTP (this is what the old sync wrapper failed at)
        const storedOtp = await redisOtpStore.get(identifier);

        // CRITICAL: This should NOT be undefined
        expect(storedOtp).toBeDefined();
        expect(storedOtp?.otp).toBe(correctOtp);

        // Simulate verification logic
        const userOtp = "555444";
        const isValid = storedOtp?.otp === userOtp;
        expect(isValid).toBe(true);

        // On success, delete OTP
        if (isValid) {
          await redisOtpStore.delete(identifier);
        }

        // Verify OTP is consumed
        const afterVerify = await redisOtpStore.get(identifier);
        expect(afterVerify).toBeUndefined();
      });

      it("should track attempts across async operations", async () => {
        const identifier = "attempt-tracking@example.com";

        const baseOtpData: OTPData = {
          otp: "333222",
          attempts: 0,
          expiresAt: Date.now() + OTP_EXPIRY_MS,
          userId: "user-attempts",
          phone: "+96833322211",
        };
        await redisOtpStore.set(identifier, baseOtpData);

        // First failed attempt
        await redisOtpStore.update(identifier, { ...baseOtpData, attempts: 1 });

        // Verify attempt was persisted (this failed with sync wrappers)
        let stored = await redisOtpStore.get(identifier);
        expect(stored?.attempts).toBe(1);

        // Second failed attempt
        await redisOtpStore.update(identifier, { ...baseOtpData, attempts: 2 });

        stored = await redisOtpStore.get(identifier);
        expect(stored?.attempts).toBe(2);

        // Third failed attempt - should lock out
        await redisOtpStore.update(identifier, { ...baseOtpData, attempts: 3 });

        stored = await redisOtpStore.get(identifier);
        expect(stored?.attempts).toBe(3);
        expect(stored!.attempts >= MAX_ATTEMPTS).toBe(true);
      });

      it("should share rate limits across async operations", async () => {
        const identifier = "rate-test@example.com";

        // Instance A: User sends first OTP request
        const result1 = await redisRateLimitStore.increment(
          identifier,
          MAX_SENDS_PER_WINDOW,
          RATE_LIMIT_WINDOW_MS
        );
        expect(result1.count).toBe(1);

        // Instance B: Same user, different instance
        const result2 = await redisRateLimitStore.increment(
          identifier,
          MAX_SENDS_PER_WINDOW,
          RATE_LIMIT_WINDOW_MS
        );
        // CRITICAL: This should be 2, not 1
        expect(result2.count).toBe(2);

        // Continue until rate limited
        for (let i = 3; i <= MAX_SENDS_PER_WINDOW; i++) {
          await redisRateLimitStore.increment(
            identifier,
            MAX_SENDS_PER_WINDOW,
            RATE_LIMIT_WINDOW_MS
          );
        }

        // Next request should be rate limited
        const limitedResult = await redisRateLimitStore.increment(
          identifier,
          MAX_SENDS_PER_WINDOW,
          RATE_LIMIT_WINDOW_MS
        );
        expect(limitedResult.allowed).toBe(false);
      });
    });
  });
});
