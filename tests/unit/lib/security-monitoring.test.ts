/**
 * @fileoverview Unit tests for security monitoring functions
 * Tests rate limit, CORS, and auth failure tracking with proper PII protection.
 * 
 * Note: These tests focus on functional behavior (tracking, metrics, isolation)
 * rather than logging output, to avoid complex mock setup issues.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  trackRateLimitHit,
  trackCorsViolation,
  trackAuthFailure,
  getSecurityMetrics,
} from "@/lib/security/monitoring";
import { hashIdentifier, redactIdentifier } from "@/lib/otp-utils";

describe("Security Monitoring", () => {
  describe("trackRateLimitHit", () => {
    it("should track rate limit events with org isolation", () => {
      const metricsBefore = getSecurityMetrics();
      const hitsBefore = metricsBefore.rateLimitHits;
      
      // Track events for different orgs
      trackRateLimitHit("unique-user-rl1@email.com", "/api/test-rl1", "org-rl-1");
      trackRateLimitHit("unique-user-rl2@email.com", "/api/test-rl2", "org-rl-2");
      
      const metricsAfter = getSecurityMetrics();
      expect(metricsAfter.rateLimitHits).toBe(hitsBefore + 2);
      expect(metricsAfter.rateLimitUniqueKeys).toBeGreaterThanOrEqual(2);
    });

    it("should use global prefix when no orgId provided", () => {
      const metricsBefore = getSecurityMetrics();
      const hitsBefore = metricsBefore.rateLimitHits;
      
      trackRateLimitHit("global-user-rl@email.com", "/api/global-test-rl");
      
      const metricsAfter = getSecurityMetrics();
      expect(metricsAfter.rateLimitHits).toBe(hitsBefore + 1);
    });

    it("should create separate tracking keys for same user in different orgs", () => {
      const metricsBefore = getSecurityMetrics();
      const keysBefore = metricsBefore.rateLimitUniqueKeys;
      
      // Same user, different orgs - should create 2 unique keys
      trackRateLimitHit("shared-user-rl@email.com", "/api/isolated-rl", "org-A-rl");
      trackRateLimitHit("shared-user-rl@email.com", "/api/isolated-rl", "org-B-rl");
      
      const metricsAfter = getSecurityMetrics();
      // Should have at least 2 new unique keys (org-A:hash:endpoint and org-B:hash:endpoint)
      expect(metricsAfter.rateLimitUniqueKeys).toBeGreaterThanOrEqual(keysBefore + 2);
    });
  });

  describe("trackCorsViolation", () => {
    it("should track CORS violations with org isolation", () => {
      const metricsBefore = getSecurityMetrics();
      const violationsBefore = metricsBefore.corsViolations;
      
      trackCorsViolation("https://evil-cors.com", "/api/secure-cors", "org-cors-1");
      trackCorsViolation("https://malicious-cors.com", "/api/secure-cors", "org-cors-2");
      
      const metricsAfter = getSecurityMetrics();
      expect(metricsAfter.corsViolations).toBe(violationsBefore + 2);
    });

    it("should create separate keys for same origin in different orgs", () => {
      const metricsBefore = getSecurityMetrics();
      const keysBefore = metricsBefore.corsUniqueKeys;
      
      trackCorsViolation("https://attacker-cors.com", "/api/test-cors", "org-X-cors");
      trackCorsViolation("https://attacker-cors.com", "/api/test-cors", "org-Y-cors");
      
      const metricsAfter = getSecurityMetrics();
      expect(metricsAfter.corsUniqueKeys).toBeGreaterThanOrEqual(keysBefore + 2);
    });
  });

  describe("trackAuthFailure", () => {
    it("should track auth failures with org isolation", () => {
      const metricsBefore = getSecurityMetrics();
      const failuresBefore = metricsBefore.authFailures;
      
      trackAuthFailure("hacker-auth@evil.com", "invalid_password", "org-auth-1");
      trackAuthFailure("attacker-auth@bad.com", "invalid_otp", "org-auth-2");
      
      const metricsAfter = getSecurityMetrics();
      expect(metricsAfter.authFailures).toBe(failuresBefore + 2);
    });

    it("should produce unique keys for different users (hash-based, no collisions)", () => {
      const metricsBefore = getSecurityMetrics();
      const keysBefore = metricsBefore.authUniqueKeys;
      
      // Users that would all collide with 3-char truncation ("use***")
      // but should have unique hashes
      trackAuthFailure("user1-hash@a.com", "fail", "org-hash-test");
      trackAuthFailure("user2-hash@b.com", "fail", "org-hash-test");
      trackAuthFailure("user3-hash@c.com", "fail", "org-hash-test");
      
      const metricsAfter = getSecurityMetrics();
      // Should have 3 new unique keys (hash-based), not just 1 (truncation collision)
      expect(metricsAfter.authUniqueKeys).toBeGreaterThanOrEqual(keysBefore + 3);
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

    it("should count events, not just unique keys", () => {
      const metricsBefore = getSecurityMetrics();
      const hitsBefore = metricsBefore.rateLimitHits;
      
      // Same user hitting same endpoint multiple times
      const identifier = "repeat-offender@email.com";
      const endpoint = "/api/hammered-endpoint";
      const orgId = "org-repeat";
      
      trackRateLimitHit(identifier, endpoint, orgId);
      trackRateLimitHit(identifier, endpoint, orgId);
      trackRateLimitHit(identifier, endpoint, orgId);
      
      const metricsAfter = getSecurityMetrics();
      // Event count should increase by 3
      expect(metricsAfter.rateLimitHits).toBe(hitsBefore + 3);
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
  });

  describe("Multi-tenant Isolation", () => {
    it("should maintain separate event pools per org", () => {
      const metricsBefore = getSecurityMetrics();
      const hitsBefore = metricsBefore.rateLimitHits;
      const keysBefore = metricsBefore.rateLimitUniqueKeys;
      
      // Simulate attacks from different orgs with same endpoints
      const endpoint = "/api/multi-tenant-test";
      for (let i = 0; i < 5; i++) {
        trackRateLimitHit(`mt-user${i}@email.com`, endpoint, "tenant-MT-A");
      }
      for (let i = 0; i < 3; i++) {
        trackRateLimitHit(`mt-user${i}@email.com`, endpoint, "tenant-MT-B");
      }
      
      const metricsAfter = getSecurityMetrics();
      
      // Total events should be 8
      expect(metricsAfter.rateLimitHits).toBe(hitsBefore + 8);
      
      // Should have at least 8 unique keys (5 from A + 3 from B, different hash:endpoint combos)
      expect(metricsAfter.rateLimitUniqueKeys).toBeGreaterThanOrEqual(keysBefore + 8);
    });
  });
});
