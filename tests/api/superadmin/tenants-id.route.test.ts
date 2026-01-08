/**
 * @fileoverview Tests for superadmin/tenants/[id] API route
 * @description GET/PATCH/DELETE endpoints for managing individual organizations
 * @route /api/superadmin/tenants/[id]
 * @sprint 40
 * @agent [AGENT-680-FULL]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "@/app/api/superadmin/tenants/[id]/route";

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
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(null),
    }),
    findByIdAndUpdate: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
    findByIdAndDelete: vi.fn().mockResolvedValue(null),
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

const createContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe("superadmin/tenants/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/superadmin/tenants/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      const request = new NextRequest("http://localhost:3000/api/superadmin/tenants/507f1f77bcf86cd799439011");
      const response = await GET(request, createContext("507f1f77bcf86cd799439011"));
      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid ObjectId", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const request = new NextRequest("http://localhost:3000/api/superadmin/tenants/invalid-id");
      const response = await GET(request, createContext("invalid-id"));
      expect(response.status).toBe(400);
    });

    it("should return 404 for non-existent organization", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const request = new NextRequest("http://localhost:3000/api/superadmin/tenants/507f1f77bcf86cd799439011");
      const response = await GET(request, createContext("507f1f77bcf86cd799439011"));
      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /api/superadmin/tenants/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      const request = new NextRequest("http://localhost:3000/api/superadmin/tenants/507f1f77bcf86cd799439011", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Org" }),
      });
      const response = await PATCH(request, createContext("507f1f77bcf86cd799439011"));
      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid ObjectId", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const request = new NextRequest("http://localhost:3000/api/superadmin/tenants/invalid-id", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Org" }),
      });
      const response = await PATCH(request, createContext("invalid-id"));
      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/superadmin/tenants/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      const request = new NextRequest("http://localhost:3000/api/superadmin/tenants/507f1f77bcf86cd799439011", {
        method: "DELETE",
      });
      const response = await DELETE(request, createContext("507f1f77bcf86cd799439011"));
      expect(response.status).toBe(401);
    });
  });
});
