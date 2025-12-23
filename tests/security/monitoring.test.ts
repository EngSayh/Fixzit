/**
 * Security Monitoring Tests
 * 
 * Tests the security monitoring module which tracks rate limits,
 * CORS violations, and authentication failures.
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { mockFetch, restoreFetch } from "@/tests/helpers/domMocks";

// Mock dependencies
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock log-sanitizer (used by monitoring.ts for redactIdentifier internally)
vi.mock("@/lib/security/log-sanitizer", () => ({
  sanitizeValue: vi.fn((value: string) => "[REDACTED]"),
}));

describe("Security Monitoring", () => {
  let trackRateLimitHit: (identifier: string, endpoint: string) => void;
  let trackCorsViolation: (origin: string, endpoint: string) => void;
  let trackAuthFailure: (identifier: string, reason: string) => void;
  let getSecurityMetrics: () => Record<string, number>;
  let logger: { info: Mock; warn: Mock; error: Mock };
  let fetchSpy: ReturnType<typeof mockFetch>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    fetchSpy = mockFetch();
    
    // Clear environment variable
    delete process.env.SECURITY_ALERT_WEBHOOK;
    
    fetchSpy.mockResolvedValue(new Response(null, { status: 200 }));

    // Import fresh modules
    const monitoringModule = await import("@/lib/security/monitoring");
    trackRateLimitHit = monitoringModule.trackRateLimitHit;
    trackCorsViolation = monitoringModule.trackCorsViolation;
    trackAuthFailure = monitoringModule.trackAuthFailure;
    getSecurityMetrics = monitoringModule.getSecurityMetrics;

    const loggerModule = await import("@/lib/logger");
    logger = loggerModule.logger as unknown as { info: Mock; warn: Mock; error: Mock };
  });

  afterEach(() => {
    vi.resetModules();
    delete process.env.SECURITY_ALERT_WEBHOOK;
    restoreFetch();
  });

  describe("trackRateLimitHit", () => {
    it("should track rate limit hits", async () => {
      const identifier = "user@example.com";
      const endpoint = "/api/test";

      trackRateLimitHit(identifier, endpoint);

      const metrics = getSecurityMetrics();
      expect(metrics.rateLimitHits).toBeGreaterThanOrEqual(1);
    });

    it("should log warnings after verbose threshold", async () => {
      const identifier = "user@example.com";
      const endpoint = "/api/test";

      // Hit the verbose logging threshold (5 hits)
      for (let i = 0; i < 5; i++) {
        trackRateLimitHit(identifier, endpoint);
      }

      // Should have logged at least one warning
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe("trackCorsViolation", () => {
    it("should track CORS violations", async () => {
      const origin = "https://attacker-site.com";
      const endpoint = "/api/secure";

      trackCorsViolation(origin, endpoint);

      const metrics = getSecurityMetrics();
      expect(metrics.corsViolations).toBeGreaterThanOrEqual(1);
    });

    it("should log warnings after verbose threshold", async () => {
      const origin = "https://evil-domain.com";
      const endpoint = "/api/data";

      // Hit the verbose logging threshold (5 hits)
      for (let i = 0; i < 5; i++) {
        trackCorsViolation(origin, endpoint);
      }

      // Should have logged at least one warning
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe("trackAuthFailure", () => {
    it("should track authentication failures", async () => {
      const userId = "admin@company.com";
      const reason = "Invalid password";

      trackAuthFailure(userId, reason);

      const metrics = getSecurityMetrics();
      expect(metrics.authFailures).toBeGreaterThanOrEqual(1);
    });

    it("should log errors after verbose threshold", async () => {
      const userId = "admin@company.com";
      const reason = "Invalid credentials";

      // Hit the verbose logging threshold (5 hits)
      for (let i = 0; i < 5; i++) {
        trackAuthFailure(userId, reason);
      }

      // Should have logged at least one error
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("getSecurityMetrics", () => {
    it("should return metrics object", async () => {
      const metrics = getSecurityMetrics();

      expect(metrics).toHaveProperty("rateLimitHits");
      expect(metrics).toHaveProperty("corsViolations");
      expect(metrics).toHaveProperty("authFailures");
      expect(metrics).toHaveProperty("windowMs");
    });

    it("should track multiple event types independently", async () => {
      trackRateLimitHit("user@a.com", "/api/rate");
      trackCorsViolation("https://bad.com", "/api/cors");
      trackAuthFailure("user@b.com", "expired");

      const metrics = getSecurityMetrics();

      expect(metrics.rateLimitHits).toBeGreaterThanOrEqual(1);
      expect(metrics.corsViolations).toBeGreaterThanOrEqual(1);
      expect(metrics.authFailures).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Webhook Alerts", () => {
    it("should send webhook when rate limit threshold is exceeded", async () => {
      process.env.SECURITY_ALERT_WEBHOOK = "https://hooks.example.com/alert";

      vi.resetModules();
      const monitoringModule = await import("@/lib/security/monitoring");
      
      const identifier = "test-user@domain.com";
      const endpoint = "/api/auth";

      // Trigger exactly threshold number of hits (100 for rate limit)
      for (let i = 0; i < 100; i++) {
        monitoringModule.trackRateLimitHit(identifier, endpoint);
      }

      // Webhook should be called when threshold is hit
      expect(fetchSpy).toHaveBeenCalled();
    });
  });
});

describe("Monitoring Module Exports", () => {
  it("should export trackRateLimitHit", async () => {
    const monitoring = await import("@/lib/security/monitoring");
    expect(monitoring.trackRateLimitHit).toBeDefined();
    expect(typeof monitoring.trackRateLimitHit).toBe("function");
  });

  it("should export trackCorsViolation", async () => {
    const monitoring = await import("@/lib/security/monitoring");
    expect(monitoring.trackCorsViolation).toBeDefined();
    expect(typeof monitoring.trackCorsViolation).toBe("function");
  });

  it("should export trackAuthFailure", async () => {
    const monitoring = await import("@/lib/security/monitoring");
    expect(monitoring.trackAuthFailure).toBeDefined();
    expect(typeof monitoring.trackAuthFailure).toBe("function");
  });

  it("should export getSecurityMetrics", async () => {
    const monitoring = await import("@/lib/security/monitoring");
    expect(monitoring.getSecurityMetrics).toBeDefined();
    expect(typeof monitoring.getSecurityMetrics).toBe("function");
  });
});
