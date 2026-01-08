/**
 * @fileoverview Tests for superadmin catalog/services/[id] endpoint
 * @route GET,PUT,DELETE /api/superadmin/catalog/services/[id]
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

vi.mock("@/server/models/FMService", () => ({
  FMService: {
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: "123", name: "Test Service" }),
    }),
    findByIdAndUpdate: vi.fn().mockResolvedValue({}),
    findByIdAndDelete: vi.fn().mockResolvedValue({}),
  },
}));

const { GET, PUT, DELETE } = await import("@/app/api/superadmin/catalog/services/[id]/route");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

describe("Superadmin Catalog Services [id] API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
    } as any);
  });

  const validId = "507f1f77bcf86cd799439011";

  describe("GET /api/superadmin/catalog/services/[id]", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/superadmin/catalog/services/${validId}`);

      const response = await GET(request, { params: Promise.resolve({ id: validId }) });
      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid ID", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/catalog/services/invalid");

      const response = await GET(request, { params: Promise.resolve({ id: "invalid" }) });
      expect(response.status).toBe(400);
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest(`http://localhost/api/superadmin/catalog/services/${validId}`);

      const response = await GET(request, { params: Promise.resolve({ id: validId }) });
      expect(response.status).toBe(429);
    });
  });

  describe("PUT /api/superadmin/catalog/services/[id]", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/superadmin/catalog/services/${validId}`, {
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: validId }) });
      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/superadmin/catalog/services/[id]", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/superadmin/catalog/services/${validId}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: validId }) });
      expect(response.status).toBe(401);
    });
  });
});
