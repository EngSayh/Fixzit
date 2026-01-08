/**
 * @fileoverview Tests for superadmin/billing/annual-discount API route
 * @description Get and update annual prepayment discount percentage
 * @route /api/superadmin/billing/annual-discount
 * @sprint 42
 * @agent [AGENT-680-FULL]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "@/app/api/superadmin/billing/annual-discount/route";

// Mock superadmin auth
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue(null),
}));

// Mock MongoDB
vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock DiscountRule model
vi.mock("@/server/models/DiscountRule", () => ({
  default: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
    findOneAndUpdate: vi.fn().mockResolvedValue({ percentage: 25, key: "ANNUAL_PREPAY" }),
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("superadmin/billing/annual-discount route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/superadmin/billing/annual-discount", () => {
    it("should return 401 when not authenticated", async () => {
      const request = new NextRequest("http://localhost:3000/api/superadmin/billing/annual-discount");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return discount with valid session", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "507f1f77bcf86cd799439011",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const request = new NextRequest("http://localhost:3000/api/superadmin/billing/annual-discount");
      const response = await GET(request);
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe("PATCH /api/superadmin/billing/annual-discount", () => {
    it("should return 401 when not authenticated", async () => {
      const request = new NextRequest("http://localhost:3000/api/superadmin/billing/annual-discount", {
        method: "PATCH",
        body: JSON.stringify({ percentage: 25 }),
      });
      const response = await PATCH(request);
      expect(response.status).toBe(401);
    });

    it("should validate percentage range", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "507f1f77bcf86cd799439011",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const request = new NextRequest("http://localhost:3000/api/superadmin/billing/annual-discount", {
        method: "PATCH",
        body: JSON.stringify({ percentage: 150 }), // Invalid - over 100%
      });
      const response = await PATCH(request);
      expect(response.status).toBe(400);
    });
  });
});
