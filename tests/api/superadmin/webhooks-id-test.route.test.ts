/**
 * @fileoverview Tests for superadmin webhooks/[id]/test endpoint
 * @route POST /api/superadmin/webhooks/[id]/test
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/server/models/Webhook", () => ({
  Webhook: {
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ 
        _id: "123", 
        name: "Test Webhook",
        url: "https://example.com/webhook",
        secret: "test-secret",
      }),
    }),
  },
}));

vi.mock("@/server/models/WebhookDelivery", () => ({
  WebhookDelivery: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

const { POST } = await import("@/app/api/superadmin/webhooks/[id]/test/route");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

describe("Superadmin Webhooks Test API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
    } as any);
    // Mock fetch for webhook test
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: vi.fn().mockResolvedValue("OK"),
    });
  });

  const validId = "507f1f77bcf86cd799439011";

  describe("POST /api/superadmin/webhooks/[id]/test", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/superadmin/webhooks/${validId}/test`, {
        method: "POST",
      });

      const response = await POST(request, { params: Promise.resolve({ id: validId }) });
      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid ID", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/webhooks/invalid/test", {
        method: "POST",
      });

      const response = await POST(request, { params: Promise.resolve({ id: "invalid" }) });
      expect(response.status).toBe(400);
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest(`http://localhost/api/superadmin/webhooks/${validId}/test`, {
        method: "POST",
      });

      const response = await POST(request, { params: Promise.resolve({ id: validId }) });
      expect(response.status).toBe(429);
    });
  });
});
