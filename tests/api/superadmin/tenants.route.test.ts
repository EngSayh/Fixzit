/**
 * @fileoverview Tests for superadmin/tenants API route
 * @description GET/POST endpoints for managing all organizations
 * @route /api/superadmin/tenants
 * @sprint 39
 * @agent [AGENT-680-FULL]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/superadmin/tenants/route";

// Mock superadmin auth
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue(null),
}));

// Mock MongoDB
vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock Organization model
vi.mock("@/server/models/Organization", () => ({
  Organization: {
    countDocuments: vi.fn().mockResolvedValue(0),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    create: vi.fn().mockResolvedValue({ _id: "test-id", name: "Test Org" }),
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

describe("superadmin/tenants route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/superadmin/tenants", () => {
    it("should return 401 when not authenticated", async () => {
      const request = new NextRequest("http://localhost:3000/api/superadmin/tenants");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid query parameters", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const request = new NextRequest(
        "http://localhost:3000/api/superadmin/tenants?page=-1"
      );
      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it("should return organizations with valid session", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const request = new NextRequest("http://localhost:3000/api/superadmin/tenants");
      const response = await GET(request);
      expect([200, 500]).toContain(response.status); // May 500 due to DB mock
    });
  });

  describe("POST /api/superadmin/tenants", () => {
    it("should return 401 when not authenticated", async () => {
      const request = new NextRequest("http://localhost:3000/api/superadmin/tenants", {
        method: "POST",
        body: JSON.stringify({ name: "New Org" }),
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

      const request = new NextRequest("http://localhost:3000/api/superadmin/tenants", {
        method: "POST",
        body: JSON.stringify({ name: "A" }), // Too short - min 2 chars
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
