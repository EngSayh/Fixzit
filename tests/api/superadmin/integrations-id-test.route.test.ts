/**
 * @fileoverview Tests for superadmin integrations/[id]/test endpoint
 * @route POST /api/superadmin/integrations/[id]/test
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

vi.mock("@/server/models/Integration", () => ({
  Integration: {
    findById: vi.fn().mockResolvedValue({
      _id: "123",
      name: "Test Integration",
      type: "generic",
      testConnection: vi.fn().mockResolvedValue({ success: true }),
    }),
  },
}));

const { POST } = await import("@/app/api/superadmin/integrations/[id]/test/route");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

describe("Superadmin Integrations Test API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
    } as any);
  });

  const validId = "507f1f77bcf86cd799439011";

  describe("POST /api/superadmin/integrations/[id]/test", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/superadmin/integrations/${validId}/test`, {
        method: "POST",
      });

      const response = await POST(request, { params: Promise.resolve({ id: validId }) });
      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid ID", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/integrations/invalid/test", {
        method: "POST",
      });

      const response = await POST(request, { params: Promise.resolve({ id: "invalid" }) });
      expect(response.status).toBe(400);
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest(`http://localhost/api/superadmin/integrations/${validId}/test`, {
        method: "POST",
      });

      const response = await POST(request, { params: Promise.resolve({ id: validId }) });
      expect(response.status).toBe(429);
    });
  });
});
