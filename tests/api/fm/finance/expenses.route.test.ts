/**
 * @fileoverview Tests for FM Finance Expenses API route
 * @module tests/api/fm/finance/expenses
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

import { GET, POST } from "@/app/api/fm/finance/expenses/route";

describe("FM Finance Expenses API", () => {
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
    });
    mockEnforceRateLimit.mockReturnValue(undefined);
  });

  describe("GET /api/fm/finance/expenses", () => {
    it("should return 401 when permission check fails", async () => {
      mockRequireFmPermission.mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest("http://localhost/api/fm/finance/expenses");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("should return expenses list with pagination", async () => {
      const mockExpenses = [
        { _id: "exp-1", vendor: "ABC Corp", category: "Maintenance", amount: 5000, status: "pending" },
        { _id: "exp-2", vendor: "XYZ Ltd", category: "Supplies", amount: 2500, status: "approved" },
      ];

      mockCollection.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockExpenses),
      });
      mockCollection.countDocuments.mockResolvedValue(2);

      const req = new NextRequest("http://localhost/api/fm/finance/expenses?page=1&limit=10");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(2);
    });

    it("should filter expenses by status", async () => {
      const mockExpenses = [
        { _id: "exp-1", vendor: "ABC Corp", status: "pending" },
      ];

      mockCollection.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockExpenses),
      });
      mockCollection.countDocuments.mockResolvedValue(1);

      const req = new NextRequest("http://localhost/api/fm/finance/expenses?status=pending");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
    });

    it("should handle rate limiting", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Too many requests" }, { status: 429 })
      );

      const req = new NextRequest("http://localhost/api/fm/finance/expenses");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });
  });

  describe("POST /api/fm/finance/expenses", () => {
    it("should return 401 when permission check fails", async () => {
      mockRequireFmPermission.mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest("http://localhost/api/fm/finance/expenses", {
        method: "POST",
        body: JSON.stringify({ vendor: "Test" }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("should create a new expense with valid data", async () => {
      mockCollection.insertOne.mockResolvedValue({ insertedId: "new-expense-id" });

      const expenseData = {
        vendor: "Maintenance Solutions Inc",
        category: "Equipment Repair",
        amount: 15000,
        currency: "SAR",
        description: "HVAC system repair",
      };

      const req = new NextRequest("http://localhost/api/fm/finance/expenses", {
        method: "POST",
        body: JSON.stringify(expenseData),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.data.id).toBeDefined();
    });

    it("should return 400 for missing vendor", async () => {
      const req = new NextRequest("http://localhost/api/fm/finance/expenses", {
        method: "POST",
        body: JSON.stringify({ category: "Test", amount: 100 }), // missing vendor
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid amount", async () => {
      const req = new NextRequest("http://localhost/api/fm/finance/expenses", {
        method: "POST",
        body: JSON.stringify({ vendor: "Test", category: "Ops", amount: -500 }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("should set default status to pending", async () => {
      mockCollection.insertOne.mockResolvedValue({ insertedId: "new-expense-id" });

      const expenseData = {
        vendor: "Test Vendor",
        category: "Supplies",
        amount: 500,
        currency: "SAR",
      };

      const req = new NextRequest("http://localhost/api/fm/finance/expenses", {
        method: "POST",
        body: JSON.stringify(expenseData),
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({ status: "pending" })
      );
    });
  });
});
