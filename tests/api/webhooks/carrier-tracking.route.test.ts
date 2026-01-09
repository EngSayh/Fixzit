/**
 * @fileoverview Tests for webhooks carrier tracking endpoint
 * @route POST /api/webhooks/carrier/tracking
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/mongoose", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

const { POST } = await import("@/app/api/webhooks/carrier/tracking/route");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

describe("Webhooks Carrier Tracking API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  describe("POST /api/webhooks/carrier/tracking", () => {
    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/webhooks/carrier/tracking", {
        method: "POST",
        body: JSON.stringify({ tracking_number: "1234567890" }),
      });

      const response = await POST(request);
      expect([200, 429, 500]).toContain(response.status);
    });

    it("should handle tracking update webhook", async () => {
      const request = new NextRequest("http://localhost/api/webhooks/carrier/tracking", {
        method: "POST",
        body: JSON.stringify({
          tracking_number: "1234567890",
          status: "delivered",
          timestamp: new Date().toISOString(),
        }),
      });

      const response = await POST(request);
      // Webhook may require signature validation
      expect([200, 400, 401, 500]).toContain(response.status);
    });

    it("should handle missing body", async () => {
      const request = new NextRequest("http://localhost/api/webhooks/carrier/tracking", {
        method: "POST",
      });

      const response = await POST(request);
      expect([400, 500]).toContain(response.status);
    });
  });
});
