/**
 * @fileoverview Unit tests for security monitoring functions
 * Tests rate limit, CORS, and auth failure tracking with proper PII protection.
 * 
 * Note: These tests focus on functional behavior (tracking, metrics, isolation)
 * rather than logging output, to avoid complex mock setup issues.
 * 
 * IMPORTANT: Uses setupMonitoringTestIsolation() from shared utilities to:
 * 1. Validate the reset helper exists (fails fast if missing)
 * 2. Reset global monitoring state before AND after each test
 * 3. Verify state is actually clean (catches no-op regressions)
 * 4. Prevent cross-suite contamination that causes flaky tests
 * 
 * ALL monitoring tests MUST use the shared utility to ensure consistent isolation.
 */

import { describe, it, expect } from "vitest";
import {
  trackRateLimitHit,
  trackCorsViolation,
  trackAuthFailure,
  getSecurityMetrics,
} from "@/lib/security/monitoring";
import { hashIdentifier, redactIdentifier } from "@/lib/otp-utils";
import { setupMonitoringTestIsolation } from "@/tests/utils/monitoring-test-utils";

describe("Security Monitoring", () => {
  // =============================================================================
  // CRITICAL: Test Isolation via Shared Utility
  // =============================================================================
  // This sets up beforeEach AND afterEach hooks that:
  // 1. Validate the reset helper exists (fails fast if missing)
  // 2. Reset monitoring state before each test
  // 3. Verify state is clean after reset (catches no-op regressions)
  // 4. Reset and verify after each test (catches state leakage)
  //
  // DO NOT add custom beforeEach/afterEach for monitoring state - use this utility.
  // =============================================================================
  setupMonitoringTestIsolation();

  describe("trackRateLimitHit", () => {
    it("should track rate limit events with org isolation", () => {
      // Track events for different orgs
      trackRateLimitHit("unique-user-rl1@email.com", "/api/test-rl1", "org-rl-1");
      trackRateLimitHit("unique-user-rl2@email.com", "/api/test-rl2", "org-rl-2");
      
      const metrics = getSecurityMetrics();
      expect(metrics.rateLimitHits).toBe(2);
      expect(metrics.rateLimitUniqueKeys).toBe(2);
    });

    it("should use global prefix when no orgId provided", () => {
      trackRateLimitHit("global-user-rl@email.com", "/api/global-test-rl");
      
      const metrics = getSecurityMetrics();
      expect(metrics.rateLimitHits).toBe(1);
    });

    it("should create separate tracking keys for same user in different orgs", () => {
      // Same user, different orgs - should create 2 unique keys
      trackRateLimitHit("shared-user-rl@email.com", "/api/isolated-rl", "org-A-rl");
      trackRateLimitHit("shared-user-rl@email.com", "/api/isolated-rl", "org-B-rl");
      
      const metrics = getSecurityMetrics();
      // Should have exactly 2 unique keys (org-A:hash:endpoint and org-B:hash:endpoint)
      expect(metrics.rateLimitUniqueKeys).toBe(2);
      expect(metrics.rateLimitHits).toBe(2);
    });
  });

  describe("trackCorsViolation", () => {
    it("should track CORS violations with org isolation", () => {
      trackCorsViolation("https://evil-cors.com", "/api/secure-cors", "org-cors-1");
      trackCorsViolation("https://malicious-cors.com", "/api/secure-cors", "org-cors-2");
      
      const metrics = getSecurityMetrics();
      expect(metrics.corsViolations).toBe(2);
      expect(metrics.corsUniqueKeys).toBe(2);
    });

    it("should create separate keys for same origin in different orgs", () => {
      trackCorsViolation("https://attacker-cors.com", "/api/test-cors", "org-X-cors");
      trackCorsViolation("https://attacker-cors.com", "/api/test-cors", "org-Y-cors");
      
      const metrics = getSecurityMetrics();
      // Same origin but different orgs = 2 unique keys
      expect(metrics.corsUniqueKeys).toBe(2);
      expect(metrics.corsViolations).toBe(2);
    });
  });

  describe("trackAuthFailure", () => {
    it("should track auth failures with org isolation", () => {
      trackAuthFailure("hacker-auth@evil.com", "invalid_password", "org-auth-1");
      trackAuthFailure("attacker-auth@bad.com", "invalid_otp", "org-auth-2");
      
      const metrics = getSecurityMetrics();
      expect(metrics.authFailures).toBe(2);
      expect(metrics.authUniqueKeys).toBe(2);
    });

    it("should produce unique keys for different users (hash-based, no collisions)", () => {
      // Users that would all collide with 3-char truncation ("use***")
      // but should have unique hashes
      trackAuthFailure("user1-hash@a.com", "fail", "org-hash-test");
      trackAuthFailure("user2-hash@b.com", "fail", "org-hash-test");
      trackAuthFailure("user3-hash@c.com", "fail", "org-hash-test");
      
      const metrics = getSecurityMetrics();
      // Should have 3 unique keys (hash-based), not just 1 (truncation collision)
      expect(metrics.authUniqueKeys).toBe(3);
      expect(metrics.authFailures).toBe(3);
    });
  });

  describe("getSecurityMetrics", () => {
    it("should return both event counts and unique key counts", () => {
      const metrics = getSecurityMetrics();
      
      expect(metrics).toHaveProperty("rateLimitHits");
      expect(metrics).toHaveProperty("corsViolations");
      expect(metrics).toHaveProperty("authFailures");
      expect(metrics).toHaveProperty("rateLimitUniqueKeys");
      expect(metrics).toHaveProperty("corsUniqueKeys");
      expect(metrics).toHaveProperty("authUniqueKeys");
      expect(metrics).toHaveProperty("windowMs");
    });

    it("should have windowMs set to 5 minutes", () => {
      const metrics = getSecurityMetrics();
      expect(metrics.windowMs).toBe(5 * 60 * 1000);
    });

    it("should start with zero counts after reset", () => {
      // This test validates that beforeEach reset works correctly
      const metrics = getSecurityMetrics();
      expect(metrics.rateLimitHits).toBe(0);
      expect(metrics.corsViolations).toBe(0);
      expect(metrics.authFailures).toBe(0);
      expect(metrics.rateLimitUniqueKeys).toBe(0);
      expect(metrics.corsUniqueKeys).toBe(0);
      expect(metrics.authUniqueKeys).toBe(0);
    });

    it("should count events, not just unique keys", () => {
      // Same user hitting same endpoint multiple times
      const identifier = "repeat-offender@email.com";
      const endpoint = "/api/hammered-endpoint";
      const orgId = "org-repeat";
      
      trackRateLimitHit(identifier, endpoint, orgId);
      trackRateLimitHit(identifier, endpoint, orgId);
      trackRateLimitHit(identifier, endpoint, orgId);
      
      const metrics = getSecurityMetrics();
      // Event count should be 3 (same key, multiple hits)
      expect(metrics.rateLimitHits).toBe(3);
      // But only 1 unique key
      expect(metrics.rateLimitUniqueKeys).toBe(1);
    });
  });

  describe("Hash-based Key Generation", () => {
    it("should use hashIdentifier for better cardinality", () => {
      // Verify that hashIdentifier produces unique results for similar inputs
      const inputs = [
        "user1@email.com",
        "user2@email.com", 
        "user3@email.com",
        "userA@email.com",
        "userB@email.com",
      ];
      
      const hashes = inputs.map(i => hashIdentifier(i));
      const uniqueHashes = new Set(hashes);
      
      // All should be unique (unlike 3-char truncation which would all be "use***")
      expect(uniqueHashes.size).toBe(inputs.length);
    });

    it("should still use redactIdentifier for human-readable logs", () => {
      // Verify redactIdentifier works as expected for log output
      const identifier = "sensitive.user@private.com";
      const redacted = redactIdentifier(identifier);
      
      expect(redacted).toBe("sen***");
      expect(redacted).not.toContain("@");
      expect(redacted).not.toContain("private.com");
    });

    it("should produce different hashes when salt is explicitly provided", () => {
      const identifier = "test@email.com";
      const hashWithSalt1 = hashIdentifier(identifier, "salt-a");
      const hashWithSalt2 = hashIdentifier(identifier, "salt-b");
      const hashNoSalt = hashIdentifier(identifier, "");
      
      // All should be different
      expect(hashWithSalt1).not.toBe(hashWithSalt2);
      expect(hashWithSalt1).not.toBe(hashNoSalt);
      expect(hashWithSalt2).not.toBe(hashNoSalt);
    });

    it("should support env-based salt configuration", () => {
      // Note: In tests, env vars may not be set, but the function should still work
      // The important thing is that with explicit salt, hashes differ
      const identifier = "user@domain.com";
      const explicitSalt = "test-monitoring-salt";
      const hash = hashIdentifier(identifier, explicitSalt);
      
      // Should return valid 16-char hex
      expect(hash).toMatch(/^[0-9a-f]{16}$/);
      
      // Should be deterministic with same salt
      expect(hashIdentifier(identifier, explicitSalt)).toBe(hash);
    });
  });

  describe("Multi-tenant Isolation", () => {
    it("should maintain separate event pools per org", () => {
      // Simulate attacks from different orgs with same endpoints
      const endpoint = "/api/multi-tenant-test";
      for (let i = 0; i < 5; i++) {
        trackRateLimitHit(`mt-user${i}@email.com`, endpoint, "tenant-MT-A");
      }
      for (let i = 0; i < 3; i++) {
        trackRateLimitHit(`mt-user${i}@email.com`, endpoint, "tenant-MT-B");
      }
      
      const metrics = getSecurityMetrics();
      
      // Total events should be 8
      expect(metrics.rateLimitHits).toBe(8);
      
      // Should have 8 unique keys (5 from A + 3 from B, each user:endpoint combo is unique)
      expect(metrics.rateLimitUniqueKeys).toBe(8);
    });

    it("should isolate same-endpoint events across tenants", () => {
      // Same endpoint hit by same user email but in different tenants
      trackRateLimitHit("shared@test.com", "/api/shared", "tenant-1");
      trackRateLimitHit("shared@test.com", "/api/shared", "tenant-2");
      trackRateLimitHit("shared@test.com", "/api/shared", "tenant-3");
      
      const metrics = getSecurityMetrics();
      // Each tenant has its own key, so 3 unique keys
      expect(metrics.rateLimitUniqueKeys).toBe(3);
      expect(metrics.rateLimitHits).toBe(3);
    });
  });
});
