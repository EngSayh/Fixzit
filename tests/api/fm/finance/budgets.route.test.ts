/**
 * @fileoverview Tests for FM Finance Budgets API route
 * @module tests/api/fm/finance/budgets
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
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: mockEnforceRateLimit,
}));

import { GET, POST } from "@/app/api/fm/finance/budgets/route";

describe("FM Finance Budgets API", () => {
  const mockCollection = {
    find: vi.fn(),
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
      units: ["unit-123"],
    });
    mockEnforceRateLimit.mockReturnValue(undefined);
  });

  describe("GET /api/fm/finance/budgets", () => {
    it("should return 401 when permission check fails", async () => {
      mockRequireFmPermission.mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest("http://localhost/api/fm/finance/budgets");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("should return budgets list with pagination", async () => {
      const mockBudgets = [
        { _id: "budget-1", name: "Q1 Budget", department: "Facilities", allocated: 50000 },
        { _id: "budget-2", name: "Q2 Budget", department: "Maintenance", allocated: 75000 },
      ];

      mockCollection.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockBudgets),
      });
      mockCollection.countDocuments.mockResolvedValue(2);

      const req = new NextRequest("http://localhost/api/fm/finance/budgets?page=1&limit=10");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.pagination.total).toBe(2);
    });

    it("should handle rate limiting", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Too many requests" }, { status: 429 })
      );

      const req = new NextRequest("http://localhost/api/fm/finance/budgets");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });
  });

  describe("POST /api/fm/finance/budgets", () => {
    it("should return 401 when permission check fails", async () => {
      mockRequireFmPermission.mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest("http://localhost/api/fm/finance/budgets", {
        method: "POST",
        body: JSON.stringify({ name: "Test Budget" }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("should create a new budget with valid data", async () => {
      mockCollection.insertOne.mockResolvedValue({ insertedId: "new-budget-id" });

      const budgetData = {
        name: "Annual Maintenance Budget",
        department: "Facilities",
        allocated: 100000,
        currency: "SAR",
      };

      const req = new NextRequest("http://localhost/api/fm/finance/budgets", {
        method: "POST",
        body: JSON.stringify(budgetData),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.data.id).toBeDefined();
    });

    it("should return 400 for missing required fields", async () => {
      const req = new NextRequest("http://localhost/api/fm/finance/budgets", {
        method: "POST",
        body: JSON.stringify({ department: "Test" }), // missing name
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid allocated amount", async () => {
      const req = new NextRequest("http://localhost/api/fm/finance/budgets", {
        method: "POST",
        body: JSON.stringify({ name: "Test", department: "Ops", allocated: -100 }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });
});
