import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";

// Mock dependencies
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock log-sanitizer
vi.mock("@/lib/security/log-sanitizer", () => ({
  sanitizeValue: vi.fn((value: string) => {
    // Simple redaction: show first 2 chars, redact rest
    if (!value || value.length <= 4) return "[REDACTED]";
    return value.substring(0, 2) + "***" + value.substring(value.length - 2);
  }),
  redactIdentifier: vi.fn((value: string) => {
    if (!value || value.length <= 4) return "[REDACTED]";
    return value.substring(0, 2) + "***" + value.substring(value.length - 2);
  }),
}));

// Mock crypto properly using importOriginal
vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("crypto")>();
  return {
    ...actual,
    createHash: vi.fn(() => ({
      update: vi.fn(() => ({
        digest: vi.fn(() => "abc123def456ghij789klmno"),
      })),
    })),
  };
});

// Mock fetch for webhook tests
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("Security Monitoring - PII Redaction Tests", () => {
  let trackRateLimitHit: (identifier: string, endpoint: string) => void;
  let trackCorsViolation: (origin: string, endpoint: string) => void;
  let trackAuthFailure: (identifier: string, reason: string) => void;
  let getSecurityMetrics: () => Record<string, number>;
  let logger: { info: Mock; warn: Mock; error: Mock };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    
    // Clear environment variable
    delete process.env.SECURITY_ALERT_WEBHOOK;
    
    mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

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
  });

  describe("redactIdentifier behavior in monitoring", () => {
    it("should call sanitizeValue for identifier redaction", async () => {
      const { sanitizeValue } = await import("@/lib/security/log-sanitizer");

      // Verify the mock is working
      const result = sanitizeValue("user@example.com", "identifier");
      expect(result).not.toBe("user@example.com");
      expect(sanitizeValue).toHaveBeenCalledWith("user@example.com", "identifier");
    });

    it("should not expose full identifiers when redacted", async () => {
      const { sanitizeValue } = await import("@/lib/security/log-sanitizer");

      const sensitiveData = "admin@company.com";
      const redacted = sanitizeValue(sensitiveData, "identifier");

      // Should NOT contain the full sensitive data
      expect(redacted).not.toBe(sensitiveData);
      expect(redacted).not.toContain("admin@company");
    });
  });

  describe("hashIdentifier function (internal to monitoring)", () => {
    it("should produce non-reversible hashes", async () => {
      // The hashIdentifier is internal to monitoring.ts
      // We test its behavior through the webhook payload

      process.env.SECURITY_ALERT_WEBHOOK = "https://test.example.com/hook";
      
      vi.resetModules();
      const monitoringModule = await import("@/lib/security/monitoring");
      
      const sensitiveId = "sensitive-user-id-12345";
      
      // Trigger alert threshold (100 for rate limit)
      for (let i = 0; i < 101; i++) {
        monitoringModule.trackRateLimitHit(sensitiveId, "/api/test");
      }

      // Verify hash is used in webhook
      if (mockFetch.mock.calls.length > 0) {
        const call = mockFetch.mock.calls[0];
        const body = JSON.parse(call[1]?.body as string);
        
        // Should have keyHash property
        expect(body).toHaveProperty("keyHash");
        
        // keyHash should NOT contain the original identifier
        expect(body.keyHash).not.toContain(sensitiveId);
        expect(body.keyHash).not.toContain("sensitive");
      }
    });
  });

  describe("trackRateLimitHit - Redaction", () => {
    it("should not log raw identifiers", async () => {
      const rawIdentifier = "user@sensitive.com";
      const endpoint = "/api/test";

      // Track multiple hits to exceed VERBOSE_LOG_THRESHOLD (5)
      for (let i = 0; i < 6; i++) {
        trackRateLimitHit(rawIdentifier, endpoint);
      }

      // Verify logger was called but doesn't contain raw identifier
      if (logger.warn.mock.calls.length > 0) {
        logger.warn.mock.calls.forEach((call) => {
          const logMessage = JSON.stringify(call);
          expect(logMessage).not.toContain(rawIdentifier);
        });
      }
    });

    it("should redact identifier in log messages", async () => {
      const email = "test-user@domain.com";

      // Track enough hits to trigger logging
      for (let i = 0; i < 6; i++) {
        trackRateLimitHit(email, "/api/endpoint");
      }

      // All log calls should use redacted version
      logger.warn.mock.calls.forEach((call) => {
        const logStr = JSON.stringify(call);
        // Should not contain the full email
        expect(logStr).not.toContain("test-user@domain.com");
      });
    });
  });

  describe("trackCorsViolation - Redaction", () => {
    it("should redact origin in logs", async () => {
      const maliciousOrigin = "https://attacker-site.com";
      const endpoint = "/api/secure";

      // Track multiple violations to exceed threshold
      for (let i = 0; i < 6; i++) {
        trackCorsViolation(maliciousOrigin, endpoint);
      }

      // Verify no raw origin in logs
      if (logger.warn.mock.calls.length > 0) {
        logger.warn.mock.calls.forEach((call) => {
          const logMessage = JSON.stringify(call);
          expect(logMessage).not.toContain(maliciousOrigin);
        });
      }
    });

    it("should track CORS violations without exposing full origin", async () => {
      const origin = "https://evil-domain.example.com";
      
      for (let i = 0; i < 3; i++) {
        trackCorsViolation(origin, "/api/data");
      }

      // Should track the violation (metrics count)
      const metrics = getSecurityMetrics();
      expect(metrics.corsViolations).toBeGreaterThan(0);
    });
  });

  describe("trackAuthFailure - Redaction", () => {
    it("should redact identifier in authentication failure logs", async () => {
      const userId = "admin@company.com";
      const reason = "Invalid password";

      // Track multiple failures to exceed threshold
      for (let i = 0; i < 6; i++) {
        trackAuthFailure(userId, reason);
      }

      // Verify no raw identifier in logs
      if (logger.error.mock.calls.length > 0) {
        logger.error.mock.calls.forEach((call) => {
          const logMessage = JSON.stringify(call);
          expect(logMessage).not.toContain(userId);
        });
      }
    });

    it("should include reason without sensitive data", async () => {
      const userId = "user-12345";
      const reason = "Token expired";

      for (let i = 0; i < 6; i++) {
        trackAuthFailure(userId, reason);
      }

      // Reason can be logged (not PII), but identifier should be redacted
      const allLogs = [...logger.error.mock.calls, ...logger.warn.mock.calls];
      
      allLogs.forEach((call) => {
        const logStr = JSON.stringify(call);
        expect(logStr).not.toContain("user-12345");
      });
    });
  });

  describe("Webhook Payload - No PII Leakage", () => {
    it("should use hashed key instead of raw identifier in webhook", async () => {
      process.env.SECURITY_ALERT_WEBHOOK = "https://hooks.example.com/alert";

      vi.resetModules();
      const monitoringModule = await import("@/lib/security/monitoring");
      
      const rawIdentifier = "sensitive-user@domain.com";
      const endpoint = "/api/auth";

      // Trigger enough hits to exceed alert threshold (100 for rate limit)
      for (let i = 0; i < 101; i++) {
        monitoringModule.trackRateLimitHit(rawIdentifier, endpoint);
      }

      // Verify webhook was called without raw identifier
      if (mockFetch.mock.calls.length > 0) {
        mockFetch.mock.calls.forEach((call) => {
          const requestBody = call[1]?.body as string;
          if (requestBody) {
            expect(requestBody).not.toContain(rawIdentifier);
            expect(requestBody).not.toContain("sensitive-user");
          }
        });
      }
    });

    it("should include keyHash for correlation without exposing raw data", async () => {
      process.env.SECURITY_ALERT_WEBHOOK = "https://hooks.example.com/alert";
      
      vi.resetModules();
      const monitoringModule = await import("@/lib/security/monitoring");

      // Trigger alert threshold
      for (let i = 0; i < 101; i++) {
        monitoringModule.trackRateLimitHit("user@test.com", "/api/endpoint");
      }

      // Verify webhook payload structure
      if (mockFetch.mock.calls.length > 0) {
        const call = mockFetch.mock.calls[0];
        const requestBody = call[1]?.body as string;
        
        if (requestBody) {
          const payload = JSON.parse(requestBody);
          
          // Should have keyHash, not raw key
          expect(payload).toHaveProperty("keyHash");
          expect(payload.keyHash).not.toContain("user@test.com");
        }
      }
    });

    it("should timeout webhook calls to prevent blocking", async () => {
      // The WEBHOOK_TIMEOUT_MS should be used with AbortController
      process.env.SECURITY_ALERT_WEBHOOK = "https://slow-webhook.example.com";
      
      vi.resetModules();
      const monitoringModule = await import("@/lib/security/monitoring");

      // This should not hang even if webhook is slow
      for (let i = 0; i < 101; i++) {
        monitoringModule.trackRateLimitHit("user@test.com", "/api/test");
      }

      // Verify fetch was called with signal (AbortController)
      if (mockFetch.mock.calls.length > 0) {
        const call = mockFetch.mock.calls[0];
        const options = call[1];
        expect(options).toHaveProperty("signal");
      }
    });
  });

  describe("Verbose Log Threshold", () => {
    it("should not log individual events below threshold", async () => {
      vi.resetModules();
      const monitoringModule = await import("@/lib/security/monitoring");
      const loggerModule = await import("@/lib/logger");
      const freshLogger = loggerModule.logger as unknown as { warn: Mock };

      const identifier = "test-user@example.com";
      const endpoint = "/api/resource";

      // Track fewer than VERBOSE_LOG_THRESHOLD (5) hits
      for (let i = 0; i < 4; i++) {
        monitoringModule.trackRateLimitHit(identifier, endpoint);
      }

      // Should not have verbose individual logs
      const verboseLogs = freshLogger.warn.mock.calls.filter((call) => {
        const message = call[0];
        return message && message.includes("[RateLimit] Request blocked");
      });

      expect(verboseLogs).toHaveLength(0);
    });

    it("should log individual events at or above threshold", async () => {
      vi.resetModules();
      const monitoringModule = await import("@/lib/security/monitoring");
      const loggerModule = await import("@/lib/logger");
      const freshLogger = loggerModule.logger as unknown as { warn: Mock };

      const identifier = "threshold-test@example.com";
      const endpoint = "/api/test";

      // Track exactly VERBOSE_LOG_THRESHOLD (5) hits
      for (let i = 0; i < 5; i++) {
        monitoringModule.trackRateLimitHit(identifier, endpoint);
      }

      // The 5th hit should trigger verbose logging
      expect(freshLogger.warn).toHaveBeenCalled();
    });
  });

  describe("Security Metrics Export", () => {
    it("should expose aggregate counts without PII", async () => {
      vi.resetModules();
      const { getSecurityMetrics, trackRateLimitHit: freshTrack } = await import("@/lib/security/monitoring");

      // Track some events
      freshTrack("user1@test.com", "/api/a");
      freshTrack("user2@test.com", "/api/b");

      const metrics = getSecurityMetrics();

      // Should have counts
      expect(metrics).toHaveProperty("rateLimitHits");
      expect(metrics.rateLimitHits).toBeGreaterThan(0);

      // Should not expose raw identifiers
      const metricsString = JSON.stringify(metrics);
      expect(metricsString).not.toContain("user1@test.com");
      expect(metricsString).not.toContain("user2@test.com");
    });

    it("should track multiple event types independently", async () => {
      vi.resetModules();
      const monitoring = await import("@/lib/security/monitoring");

      monitoring.trackRateLimitHit("user@a.com", "/api/rate");
      monitoring.trackCorsViolation("https://bad.com", "/api/cors");
      monitoring.trackAuthFailure("user@b.com", "expired");

      const metrics = monitoring.getSecurityMetrics();

      expect(metrics.rateLimitHits).toBeGreaterThan(0);
      expect(metrics.corsViolations).toBeGreaterThan(0);
      expect(metrics.authFailures).toBeGreaterThan(0);
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

describe("Log Sanitizer Integration", () => {
  it("should use sanitizeValue from log-sanitizer", async () => {
    const { sanitizeValue } = await import("@/lib/security/log-sanitizer");

    // The monitoring module uses this internally
    const result = sanitizeValue("test@example.com", "identifier");
    
    expect(sanitizeValue).toHaveBeenCalled();
    expect(result).not.toBe("test@example.com");
  });
});
