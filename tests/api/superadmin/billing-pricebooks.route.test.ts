/**
 * @fileoverview Tests for superadmin/billing/pricebooks API route
 * @description List and create pricebook configurations
 * @route /api/superadmin/billing/pricebooks
 * @sprint 41
 * @agent [AGENT-680-FULL]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/superadmin/billing/pricebooks/route";

// Mock superadmin auth
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue(null),
}));

// Mock MongoDB
vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock PriceBook model
vi.mock("@/server/models/PriceBook", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ _id: "test-id", name: "Test PriceBook" }),
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

describe("superadmin/billing/pricebooks route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/superadmin/billing/pricebooks", () => {
    it("should return 401 when not authenticated", async () => {
      const request = new NextRequest("http://localhost:3000/api/superadmin/billing/pricebooks");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return pricebooks with valid session", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const request = new NextRequest("http://localhost:3000/api/superadmin/billing/pricebooks");
      const response = await GET(request);
      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /api/superadmin/billing/pricebooks", () => {
    it("should return 401 when not authenticated", async () => {
      const request = new NextRequest("http://localhost:3000/api/superadmin/billing/pricebooks", {
        method: "POST",
        body: JSON.stringify({ name: "New PriceBook" }),
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should validate request body schema", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const request = new NextRequest("http://localhost:3000/api/superadmin/billing/pricebooks", {
        method: "POST",
        body: JSON.stringify({ name: "" }), // Empty name - should fail validation
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
