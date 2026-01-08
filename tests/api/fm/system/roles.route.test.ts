/**
 * @fileoverview Tests for FM System Roles API route
 * @module tests/api/fm/system/roles
 * Sprint 69 - FM Domain Coverage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Hoisted mocks for FM routes
const {
  mockRequireFmPermission,
  mockResolveTenantId,
  mockBuildTenantFilter,
  mockGetDatabase,
  mockEnforceRateLimit,
} = vi.hoisted(() => ({
  mockRequireFmPermission: vi.fn(),
  mockResolveTenantId: vi.fn(),
  mockBuildTenantFilter: vi.fn(),
  mockGetDatabase: vi.fn(),
  mockEnforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: mockGetDatabase,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/app/api/fm/permissions", () => ({
  requireFmPermission: mockRequireFmPermission,
}));

vi.mock("@/app/api/fm/utils/tenant", () => ({
  resolveTenantId: mockResolveTenantId,
  buildTenantFilter: mockBuildTenantFilter,
  isCrossTenantMode: vi.fn().mockReturnValue(false),
  CROSS_TENANT_MARKER: "__CROSS_TENANT__",
}));

vi.mock("@/app/api/fm/errors", () => ({
  FMErrors: {
    unauthorized: vi.fn().mockImplementation(() =>
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    ),
    forbidden: vi.fn().mockImplementation(() =>
      new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
    ),
    badRequest: vi.fn().mockImplementation((msg: string) =>
      new Response(JSON.stringify({ error: msg }), { status: 400 })
    ),
    notFound: vi.fn().mockImplementation(() =>
      new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    ),
    internalError: vi.fn().mockImplementation(() =>
      new Response(JSON.stringify({ error: "Internal error" }), { status: 500 })
    ),
    validationError: vi.fn().mockImplementation((msg: string) =>
      new Response(JSON.stringify({ error: msg }), { status: 400 })
    ),
    missingTenant: vi.fn().mockImplementation(() =>
      new Response(JSON.stringify({ error: "Missing tenant" }), { status: 400 })
    ),
    conflict: vi.fn().mockImplementation((msg: string) =>
      new Response(JSON.stringify({ error: msg }), { status: 409 })
    ),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: mockEnforceRateLimit,
}));

import { GET, POST } from "@/app/api/fm/system/roles/route";

describe("FM System Roles API", () => {
  const mockCollection = {
    find: vi.fn(),
    findOne: vi.fn(),
    insertOne: vi.fn(),
    countDocuments: vi.fn(),
  };

  const mockDb = {
    collection: vi.fn().mockReturnValue(mockCollection),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDatabase.mockResolvedValue(mockDb);
    mockResolveTenantId.mockReturnValue({ tenantId: "org-123", source: "session" });
    mockBuildTenantFilter.mockReturnValue({ orgId: "org-123" });
    mockRequireFmPermission.mockResolvedValue({
      userId: "user-123",
      orgId: "org-123",
      tenantId: "org-123",
      isSuperAdmin: false,
    });
    mockEnforceRateLimit.mockReturnValue(undefined);
  });

  describe("GET /api/fm/system/roles", () => {
    it("should return 401 when permission check fails", async () => {
      mockRequireFmPermission.mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest("http://localhost/api/fm/system/roles");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("should return roles list", async () => {
      const mockRoles = [
        { _id: "role-1", name: "Property Manager", permissions: ["PROPERTIES:VIEW", "PROPERTIES:UPDATE"] },
        { _id: "role-2", name: "Maintenance Tech", permissions: ["WORK_ORDERS:VIEW", "WORK_ORDERS:UPDATE"] },
      ];

      mockCollection.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockRoles),
      });
      mockCollection.countDocuments.mockResolvedValue(2);

      const req = new NextRequest("http://localhost/api/fm/system/roles");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].permissions).toContain("PROPERTIES:VIEW");
    });

    it("should handle rate limiting", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Too many requests" }, { status: 429 })
      );

      const req = new NextRequest("http://localhost/api/fm/system/roles");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });
  });

  describe("POST /api/fm/system/roles", () => {
    it("should return 401 when permission check fails", async () => {
      mockRequireFmPermission.mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest("http://localhost/api/fm/system/roles", {
        method: "POST",
        body: JSON.stringify({ name: "Test Role" }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("should create a new role with valid data", async () => {
      mockCollection.findOne.mockResolvedValue(null); // No duplicate
      mockCollection.insertOne.mockResolvedValue({ insertedId: "new-role-id" });

      const roleData = {
        name: "Facility Coordinator",
        permissions: ["PROPERTIES:VIEW", "WORK_ORDERS:VIEW", "WORK_ORDERS:CREATE"],
        description: "Coordinates facility operations",
      };

      const req = new NextRequest("http://localhost/api/fm/system/roles", {
        method: "POST",
        body: JSON.stringify(roleData),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.data.id).toBeDefined();
    });

    it("should return 400 for missing role name", async () => {
      const req = new NextRequest("http://localhost/api/fm/system/roles", {
        method: "POST",
        body: JSON.stringify({ permissions: ["PROPERTIES:VIEW"] }), // missing name
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("should return 400 for empty permissions array", async () => {
      const req = new NextRequest("http://localhost/api/fm/system/roles", {
        method: "POST",
        body: JSON.stringify({ name: "Empty Role", permissions: [] }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("should return 409 for duplicate role name", async () => {
      mockCollection.findOne.mockResolvedValue({ _id: "existing", name: "Existing Role" });

      const req = new NextRequest("http://localhost/api/fm/system/roles", {
        method: "POST",
        body: JSON.stringify({ name: "Existing Role", permissions: ["PROPERTIES:VIEW"] }),
      });
      const res = await POST(req);

      expect(res.status).toBe(409);
    });
  });
});
