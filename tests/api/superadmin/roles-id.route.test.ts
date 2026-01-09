/**
 * @fileoverview Tests for superadmin roles/[id] endpoint
 * @route PUT,DELETE /api/superadmin/roles/[id]
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
    findById: vi.fn().mockResolvedValue({ _id: "123", name: "Test Role" }),
    findByIdAndUpdate: vi.fn().mockResolvedValue({ _id: "123", name: "Updated" }),
    findByIdAndDelete: vi.fn().mockResolvedValue({ _id: "123" }),
  },
}));

const { PUT, DELETE } = await import("@/app/api/superadmin/roles/[id]/route");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

describe("Superadmin Roles [id] API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
    } as any);
  });

  const validId = "507f1f77bcf86cd799439011";

  describe("PUT /api/superadmin/roles/[id]", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/superadmin/roles/${validId}`, {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Role" }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: validId }) });
      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid ID", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/roles/invalid", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: "invalid" }) });
      expect(response.status).toBe(400);
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest(`http://localhost/api/superadmin/roles/${validId}`, {
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: validId }) });
      expect(response.status).toBe(429);
    });
  });

  describe("DELETE /api/superadmin/roles/[id]", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/superadmin/roles/${validId}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: validId }) });
      expect(response.status).toBe(401);
    });
  });
});
