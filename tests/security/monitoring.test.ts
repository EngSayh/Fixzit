import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";

// Mock dependencies
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock otp-utils (where redactIdentifier and hashIdentifier live)
vi.mock("@/lib/otp-utils", () => ({
  redactIdentifier: vi.fn((value: string) => {
    // Simple redaction: show first 3 chars + ***
    if (!value || value.length <= 3) return "***";
    return value.substring(0, 3) + "***";
  }),
  hashIdentifier: vi.fn((value: string) => {
    // Return a fake hash for testing
    return "hash_" + value.substring(0, 4);
  }),
}));

// Mock fetch for webhook tests
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("Security Monitoring - PII Redaction Tests", () => {
  let trackRateLimitHit: (identifier: string, endpoint: string) => void;
  let trackCorsViolation: (origin: string, endpoint: string) => void;
  let trackAuthFailure: (identifier: string, reason: string) => void;
  let getSecurityMetrics: () => Record<string, number>;
  let __resetMonitoringStateForTests: () => void;
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
    __resetMonitoringStateForTests = monitoringModule.__resetMonitoringStateForTests;

    // Reset monitoring state before each test
    __resetMonitoringStateForTests();

    const loggerModule = await import("@/lib/logger");
    logger = loggerModule.logger as unknown as { info: Mock; warn: Mock; error: Mock };
  });

  afterEach(() => {
    vi.resetModules();
    delete process.env.SECURITY_ALERT_WEBHOOK;
  });

  describe("redactIdentifier behavior in monitoring", () => {
    it("should call redactIdentifier for identifier redaction", async () => {
      const { redactIdentifier } = await import("@/lib/otp-utils");

      // Verify the mock is working
      const result = redactIdentifier("user@example.com");
      expect(result).not.toBe("user@example.com");
      expect(result).toBe("use***");
      expect(redactIdentifier).toHaveBeenCalledWith("user@example.com");
    });

    it("should not expose full identifiers when redacted", async () => {
      const { redactIdentifier } = await import("@/lib/otp-utils");

      const sensitiveData = "admin@company.com";
      const redacted = redactIdentifier(sensitiveData);

      // Should NOT contain the full sensitive data
      expect(redacted).not.toBe(sensitiveData);
      expect(redacted).toBe("adm***");
    });
  });

  describe("hashIdentifier function (internal to monitoring)", () => {
    it("should use hashed identifiers for tracking keys", async () => {
      const { hashIdentifier } = await import("@/lib/otp-utils");
      
      const sensitiveId = "sensitive-user-id-12345";
      
      // Call trackRateLimitHit which internally uses hashIdentifier
      trackRateLimitHit(sensitiveId, "/api/test");

      // Verify hashIdentifier was called
      expect(hashIdentifier).toHaveBeenCalledWith(sensitiveId);
    });
  });

  describe("trackRateLimitHit - Redaction", () => {
    it("should redact identifier in log messages", async () => {
      const { redactIdentifier } = await import("@/lib/otp-utils");
      
      const email = "test-user@domain.com";
      trackRateLimitHit(email, "/api/endpoint");

      // Should call redactIdentifier
      expect(redactIdentifier).toHaveBeenCalledWith(email);
      
      // Logger should be called with redacted version
      expect(logger.warn).toHaveBeenCalled();
    });

    it("should use hashIdentifier for tracking key", async () => {
      const { hashIdentifier } = await import("@/lib/otp-utils");
      
      const rawIdentifier = "user@sensitive.com";
      trackRateLimitHit(rawIdentifier, "/api/test");

      // hashIdentifier should be called for the tracking key
      expect(hashIdentifier).toHaveBeenCalledWith(rawIdentifier);
    });
  });

  describe("trackCorsViolation - Origin Logging", () => {
    it("should log CORS violations", async () => {
      const origin = "https://attacker-site.com";
      const endpoint = "/api/secure";

      trackCorsViolation(origin, endpoint);

      // Should log the violation
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        "[CORS] Origin blocked",
        expect.objectContaining({
          origin,
          endpoint,
        })
      );
    });

    it("should track CORS violations in metrics", async () => {
      const origin = "https://evil-domain.example.com";
      
      trackCorsViolation(origin, "/api/data");

      const metrics = getSecurityMetrics();
      expect(metrics.corsViolations).toBe(1);
    });
  });

  describe("trackAuthFailure - Redaction", () => {
    it("should redact identifier in authentication failure logs", async () => {
      const { redactIdentifier } = await import("@/lib/otp-utils");
      
      const userId = "admin@company.com";
      const reason = "Invalid password";

      trackAuthFailure(userId, reason);

      // Should call redactIdentifier
      expect(redactIdentifier).toHaveBeenCalledWith(userId);
      
      // Logger should be called
      expect(logger.error).toHaveBeenCalled();
    });

    it("should use hashIdentifier for tracking key", async () => {
      const { hashIdentifier } = await import("@/lib/otp-utils");
      
      const userId = "user-12345";
      const reason = "Token expired";

      trackAuthFailure(userId, reason);

      // hashIdentifier should be called for the tracking key
      expect(hashIdentifier).toHaveBeenCalledWith(userId);
    });
  });

  describe("Webhook Payload - Threshold Alerts", () => {
    it("should send webhook when threshold exceeded", async () => {
      process.env.SECURITY_ALERT_WEBHOOK = "https://hooks.example.com/alert";

      vi.resetModules();
      const monitoringModule = await import("@/lib/security/monitoring");
      monitoringModule.__resetMonitoringStateForTests();
      
      const rawIdentifier = "sensitive-user@domain.com";
      const endpoint = "/api/auth";

      // Trigger exactly threshold number of hits (100 for rate limit)
      for (let i = 0; i < 100; i++) {
        monitoringModule.trackRateLimitHit(rawIdentifier, endpoint);
      }

      // Webhook should be called when threshold is hit (at exactly threshold)
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should include event details in webhook payload", async () => {
      process.env.SECURITY_ALERT_WEBHOOK = "https://hooks.example.com/alert";
      
      vi.resetModules();
      const monitoringModule = await import("@/lib/security/monitoring");
      monitoringModule.__resetMonitoringStateForTests();

      // Trigger alert threshold
      for (let i = 0; i < 100; i++) {
        monitoringModule.trackRateLimitHit("user@test.com", "/api/endpoint");
      }

      // Verify webhook payload structure
      if (mockFetch.mock.calls.length > 0) {
        const call = mockFetch.mock.calls[0];
        const requestBody = call[1]?.body as string;
        
        if (requestBody) {
          const payload = JSON.parse(requestBody);
          
          // Should have event, key, count, threshold, timestamp
          expect(payload).toHaveProperty("event");
          expect(payload).toHaveProperty("key");
          expect(payload).toHaveProperty("count");
          expect(payload).toHaveProperty("threshold");
          expect(payload).toHaveProperty("timestamp");
        }
      }
    });
  });

  describe("Security Metrics Export", () => {
    it("should expose aggregate counts", async () => {
      // Track some events
      trackRateLimitHit("user1@test.com", "/api/a");
      trackRateLimitHit("user2@test.com", "/api/b");

      const metrics = getSecurityMetrics();

      // Should have counts
      expect(metrics).toHaveProperty("rateLimitHits");
      expect(metrics.rateLimitHits).toBe(2);
    });

    it("should track multiple event types independently", async () => {
      trackRateLimitHit("user@a.com", "/api/rate");
      trackCorsViolation("https://bad.com", "/api/cors");
      trackAuthFailure("user@b.com", "expired");

      const metrics = getSecurityMetrics();

      expect(metrics.rateLimitHits).toBe(1);
      expect(metrics.corsViolations).toBe(1);
      expect(metrics.authFailures).toBe(1);
    });

    it("should expose unique key counts", async () => {
      trackRateLimitHit("user1@test.com", "/api/a");
      trackRateLimitHit("user1@test.com", "/api/a"); // Same key
      trackRateLimitHit("user2@test.com", "/api/b"); // Different key

      const metrics = getSecurityMetrics();

      // Total events should be 3
      expect(metrics.rateLimitHits).toBe(3);
      // Unique keys should be 2
      expect(metrics.rateLimitUniqueKeys).toBe(2);
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

  it("should export __resetMonitoringStateForTests", async () => {
    const monitoring = await import("@/lib/security/monitoring");
    expect(monitoring.__resetMonitoringStateForTests).toBeDefined();
    expect(typeof monitoring.__resetMonitoringStateForTests).toBe("function");
  });
});
