/**
 * @fileoverview Tests for superadmin roles bulk-update endpoint
 * @route POST /api/superadmin/roles/bulk-update
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

vi.mock("@/server/models/Role", () => ({
  default: {
    findByIdAndUpdate: vi.fn().mockResolvedValue({}),
  },
}));

const { POST } = await import("@/app/api/superadmin/roles/bulk-update/route");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

describe("Superadmin Roles Bulk Update API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
    } as any);
  });

  describe("POST /api/superadmin/roles/bulk-update", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/roles/bulk-update", {
        method: "POST",
        body: JSON.stringify({ updates: [] }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid body", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/roles/bulk-update", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/superadmin/roles/bulk-update", {
        method: "POST",
        body: JSON.stringify({ updates: [] }),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);
    });
  });
});
