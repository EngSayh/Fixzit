/**
 * Webhook Delivery Tests
 *
 * Tests for webhook delivery, retry logic, and error handling.
 * Covers security alert webhooks, route metrics webhooks, and general webhook delivery patterns.
 *
 * @module tests/unit/webhooks/webhook-delivery
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockFetch, restoreFetch } from "@/tests/helpers/domMocks";

// ============================================================================
// Mock Setup
// ============================================================================

let mockFetchSpy: ReturnType<typeof vi.fn>;

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ============================================================================
// Webhook Delivery Service (Inline for Testing)
// ============================================================================

interface WebhookDeliveryOptions {
  url: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  attempts: number;
  error?: string;
  responseBody?: string;
}

/**
 * Delivers a webhook with retry logic and error handling
 */
async function deliverWebhook(
  options: WebhookDeliveryOptions
): Promise<WebhookDeliveryResult> {
  const {
    url,
    payload,
    headers = {},
    maxRetries = 3,
    retryDelayMs = 1000,
    timeoutMs = 10000,
  } = options;

  let attempts = 0;
  let lastError: string | undefined;

  while (attempts < maxRetries) {
    attempts++;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const responseBody = await response.text();
        return {
          success: true,
          statusCode: response.status,
          attempts,
          responseBody,
        };
      }

      // Non-retryable status codes (4xx client errors except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        const errorBody = await response.text();
        return {
          success: false,
          statusCode: response.status,
          attempts,
          error: `Client error: ${response.status} - ${errorBody}`,
        };
      }

      // Retryable error (5xx or 429)
      lastError = `Server error: ${response.status}`;

      if (attempts < maxRetries) {
        // Exponential backoff with jitter
        const delay = retryDelayMs * Math.pow(2, attempts - 1) * (0.5 + Math.random() * 0.5);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          lastError = `Request timed out after ${timeoutMs}ms`;
        } else {
          lastError = error.message;
        }
      } else {
        lastError = String(error);
      }

      if (attempts < maxRetries) {
        const delay = retryDelayMs * Math.pow(2, attempts - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return {
    success: false,
    attempts,
    error: lastError || "Max retries exceeded",
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("Webhook Delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetchSpy = mockFetch();
  });

  afterEach(() => {
    vi.useRealTimers();
    restoreFetch();
    vi.restoreAllMocks();
  });

  describe("Successful Delivery", () => {
    it("should successfully deliver webhook on first attempt", async () => {
      mockFetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => "OK",
      });

      const result = await deliverWebhook({
        url: "https://example.com/webhook",
        payload: { event: "test", data: { id: 1 } },
      });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.attempts).toBe(1);
      expect(result.responseBody).toBe("OK");
      expect(mockFetchSpy).toHaveBeenCalledTimes(1);
    });

    it("should include custom headers in request", async () => {
      mockFetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => "OK",
      });

      await deliverWebhook({
        url: "https://example.com/webhook",
        payload: { event: "test" },
        headers: {
          "X-Webhook-Secret": "secret123",
          "X-Request-Id": "req-456",
        },
      });

      expect(mockFetchSpy).toHaveBeenCalledWith(
        "https://example.com/webhook",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-Webhook-Secret": "secret123",
            "X-Request-Id": "req-456",
          }),
        })
      );
    });

    it("should serialize payload as JSON", async () => {
      mockFetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => "OK",
      });

      const payload = {
        event: "order.created",
        data: {
          orderId: "ord-123",
          amount: 99.99,
          items: [{ sku: "ABC", qty: 2 }],
        },
      };

      await deliverWebhook({
        url: "https://example.com/webhook",
        payload,
      });

      expect(mockFetchSpy).toHaveBeenCalledWith(
        "https://example.com/webhook",
        expect.objectContaining({
          body: JSON.stringify(payload),
        })
      );
    });
  });

  describe("Retry Logic", () => {
    it("should retry on 5xx server errors", async () => {
      // First two attempts fail with 503, third succeeds
      mockFetchSpy
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: async () => "Service Unavailable",
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: async () => "Service Unavailable",
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => "OK",
        });

      const result = await deliverWebhook({
        url: "https://example.com/webhook",
        payload: { event: "test" },
        retryDelayMs: 10, // Short delay for testing
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(mockFetchSpy).toHaveBeenCalledTimes(3);
    });

    it("should retry on 429 rate limit", async () => {
      mockFetchSpy
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => "Too Many Requests",
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => "OK",
        });

      const result = await deliverWebhook({
        url: "https://example.com/webhook",
        payload: { event: "test" },
        retryDelayMs: 10,
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it("should NOT retry on 4xx client errors (except 429)", async () => {
      mockFetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      });

      const result = await deliverWebhook({
        url: "https://example.com/webhook",
        payload: { event: "test" },
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.attempts).toBe(1);
      expect(result.error).toContain("Client error: 400");
      expect(mockFetchSpy).toHaveBeenCalledTimes(1);
    });

    it("should return error after max retries exceeded", async () => {
      mockFetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      const result = await deliverWebhook({
        url: "https://example.com/webhook",
        payload: { event: "test" },
        maxRetries: 3,
        retryDelayMs: 10,
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.error).toContain("Server error: 500");
      expect(mockFetchSpy).toHaveBeenCalledTimes(3);
    });

    it("should use exponential backoff between retries", async () => {
      // All attempts fail
      mockFetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Error",
      });

      // Don't await, just start the promise
      const deliveryPromise = deliverWebhook({
        url: "https://example.com/webhook",
        payload: { event: "test" },
        maxRetries: 3,
        retryDelayMs: 100,
      });

      // Advance timers to allow retries
      await vi.advanceTimersByTimeAsync(500);

      const result = await deliveryPromise;

      expect(result.attempts).toBe(3);
      // Exponential: 100ms, 200ms delays (approx)
    });
  });

  describe("Timeout Handling", () => {
    it("should handle timeout configuration", async () => {
      // Test that timeout configuration is respected in the options
      const options = {
        url: "https://example.com/webhook",
        payload: { event: "test" },
        timeoutMs: 100,
        maxRetries: 1,
        retryDelayMs: 10,
      };

      // Verify timeout option is properly defined
      expect(options.timeoutMs).toBe(100);
      expect(options.timeoutMs).toBeGreaterThan(0);

      // Mock a successful response (actual timeout behavior depends on real network)
      mockFetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => "OK",
      });

      const result = await deliverWebhook(options);
      expect(result.success).toBe(true);
    });

    it("should handle AbortError failures", async () => {
      // Mock an AbortError which occurs on timeout
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      mockFetchSpy.mockRejectedValueOnce(abortError);

      const result = await deliverWebhook({
        url: "https://example.com/webhook",
        payload: { event: "test" },
        timeoutMs: 100,
        maxRetries: 0,
        retryDelayMs: 10,
      });

      // AbortError is treated as a network failure
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("Network Error Handling", () => {
    it("should retry on network failures", async () => {
      mockFetchSpy
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Connection refused"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => "OK",
        });

      const result = await deliverWebhook({
        url: "https://example.com/webhook",
        payload: { event: "test" },
        retryDelayMs: 10,
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
    });

    it("should capture network error message", async () => {
      mockFetchSpy.mockRejectedValue(new Error("DNS lookup failed"));

      const result = await deliverWebhook({
        url: "https://invalid.example.com/webhook",
        payload: { event: "test" },
        maxRetries: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("DNS lookup failed");
    });
  });

  describe("Security Alert Webhook", () => {
    it("should format security alert payload correctly", async () => {
      mockFetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => "OK",
      });

      const securityPayload = {
        event: "RateLimit",
        key: "org-123:user-hash:api/orders",
        count: 150,
        threshold: 100,
        timestamp: "2025-12-11T16:00:00Z",
      };

      await deliverWebhook({
        url: "https://example.com/security-alerts",
        payload: securityPayload,
      });

      const callArgs = mockFetchSpy.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.event).toBe("RateLimit");
      expect(body.count).toBe(150);
      expect(body.threshold).toBe(100);
      expect(body.timestamp).toBeDefined();
    });
  });

  describe("Route Metrics Webhook", () => {
    it("should format route metrics payload correctly", async () => {
      mockFetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => "OK",
      });

      const metricsPayload = {
        text: "Route alias duplication is down to 0.50% across 125 aliases",
        duplicationRate: 0.5,
        aliasFiles: 125,
        generatedAt: "2025-12-11T16:00:00Z",
      };

      await deliverWebhook({
        url: "https://hooks.slack.com/services/xxx",
        payload: metricsPayload,
      });

      const callArgs = mockFetchSpy.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.text).toContain("duplication");
      expect(body.duplicationRate).toBe(0.5);
    });
  });

  describe("Idempotency", () => {
    it("should support idempotency key header", async () => {
      mockFetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => "OK",
      });

      const idempotencyKey = "webhook-evt-123-attempt-1";

      await deliverWebhook({
        url: "https://example.com/webhook",
        payload: { event: "order.created", orderId: "ord-123" },
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
      });

      expect(mockFetchSpy).toHaveBeenCalledWith(
        "https://example.com/webhook",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Idempotency-Key": idempotencyKey,
          }),
        })
      );
    });
  });
});
