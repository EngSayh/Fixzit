/**
 * @fileoverview Tests for superadmin users/[id]/permissions endpoint
 * @route GET,PUT,DELETE /api/superadmin/users/[id]/permissions
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/server/models/User", () => ({
  User: {
    findById: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ 
          _id: "123", 
          email: "test@test.com",
          role: "org_admin",
          permissionOverrides: [],
        }),
      }),
    }),
    findByIdAndUpdate: vi.fn().mockResolvedValue({}),
  },
}));

const { GET, PUT, DELETE } = await import("@/app/api/superadmin/users/[id]/permissions/route");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");

describe("Superadmin Users Permissions API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
    } as any);
  });

  const validId = "507f1f77bcf86cd799439011";

  describe("GET /api/superadmin/users/[id]/permissions", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/superadmin/users/${validId}/permissions`);

      const response = await GET(request, { params: Promise.resolve({ id: validId }) });
      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid ID", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/users/invalid/permissions");

      const response = await GET(request, { params: Promise.resolve({ id: "invalid" }) });
      expect(response.status).toBe(400);
    });
  });

  describe("PUT /api/superadmin/users/[id]/permissions", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/superadmin/users/${validId}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ overrides: [], reason: "Test reason for update" }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: validId }) });
      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/superadmin/users/[id]/permissions", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/superadmin/users/${validId}/permissions`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: validId }) });
      expect(response.status).toBe(401);
    });
  });
});
