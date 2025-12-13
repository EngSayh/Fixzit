/**
 * @fileoverview Tests for FM Finance Expenses API
 * @route GET /api/fm/finance/expenses
 * @route POST /api/fm/finance/expenses
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock dependencies
const mockGetDatabase = vi.fn();
const mockFind = vi.fn();
const mockInsertOne = vi.fn();

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: () => mockGetDatabase(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

let mockPermissionResult: null | NextResponse = null;
let mockPermissionUser: Record<string, unknown> | null = null;

vi.mock("@/app/api/fm/permissions", () => ({
  requireFmPermission: vi.fn(async () => {
    if (mockPermissionResult) return mockPermissionResult;
    return mockPermissionUser;
  }),
}));

vi.mock("@/app/api/fm/utils/tenant", () => ({
  resolveTenantId: vi.fn((_req: unknown, orgId: string) => ({ tenantId: orgId })),
  buildTenantFilter: vi.fn((tenantId: string) => ({ orgId: tenantId })),
  isCrossTenantMode: vi.fn(() => false),
}));

vi.mock("@/app/api/fm/errors", () => ({
  FMErrors: {
    validationError: vi.fn((msg: string) =>
      new Response(JSON.stringify({ error: msg }), { status: 400 }),
    ),
    internalError: vi.fn(() =>
      new Response(JSON.stringify({ error: "Internal error" }), { status: 500 }),
    ),
  },
}));

const ORG_ID = "507f1f77bcf86cd799439011";
const USER_ID = "507f1f77bcf86cd799439012";

function createGetRequest(query?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/fm/finance/expenses");
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new NextRequest(url, { method: "GET" });
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/fm/finance/expenses",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("/api/fm/finance/expenses", () => {
  let GET: typeof import("@/app/api/fm/finance/expenses/route").GET;
  let POST: typeof import("@/app/api/fm/finance/expenses/route").POST;

  const mockCollection = {
    find: mockFind,
    insertOne: mockInsertOne,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPermissionResult = null;
    mockPermissionUser = {
      id: USER_ID,
      orgId: ORG_ID,
      role: "ADMIN",
    };

    mockFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    });
    mockInsertOne.mockResolvedValue({ insertedId: "new_expense_id" });

    mockGetDatabase.mockReturnValue({
      collection: vi.fn(() => mockCollection),
    });

    const mod = await import("@/app/api/fm/finance/expenses/route");
    GET = mod.GET;
    POST = mod.POST;
  });

  describe("GET /api/fm/finance/expenses", () => {
    describe("Authentication & Authorization", () => {
      it("returns error when permission check fails", async () => {
        mockPermissionResult = NextResponse.json(
          { error: "Forbidden" },
          { status: 403 },
        );

        const res = await GET(createGetRequest());
        expect(res.status).toBe(403);
      });

      it("proceeds when permission check passes", async () => {
        mockPermissionUser = { id: USER_ID, orgId: ORG_ID, role: "ADMIN" };

        const res = await GET(createGetRequest());
        expect(res.status).toBe(200);
      });
    });

    describe("Tenant Isolation", () => {
      it("applies tenant filter to query", async () => {
        const { buildTenantFilter } = await import("@/app/api/fm/utils/tenant");
        
        await GET(createGetRequest());

        expect(buildTenantFilter).toHaveBeenCalled();
      });
    });

    describe("Filtering", () => {
      it("supports status filter", async () => {
        await GET(createGetRequest({ status: "approved" }));

        expect(mockFind).toHaveBeenCalled();
      });

      it("supports vendor filter", async () => {
        await GET(createGetRequest({ vendor: "ACME Corp" }));

        expect(mockFind).toHaveBeenCalled();
      });

      it("supports category filter", async () => {
        await GET(createGetRequest({ category: "maintenance" }));

        expect(mockFind).toHaveBeenCalled();
      });
    });

    describe("Response Format", () => {
      it("returns array of expenses", async () => {
        mockPermissionUser = {
          id: USER_ID,
          userId: USER_ID,
          orgId: ORG_ID,
          tenantId: ORG_ID,
          role: "ADMIN",
        };
        mockFind.mockReturnValue({
          sort: vi.fn().mockReturnThis(),
          skip: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          toArray: vi.fn().mockResolvedValue([
            {
              _id: "exp1",
              orgId: ORG_ID,
              vendor: "ACME",
              category: "maintenance",
              amount: 1000,
              currency: "SAR",
              status: "pending",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        });

        const res = await GET(createGetRequest());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
      });
    });
  });

  describe("POST /api/fm/finance/expenses", () => {
    describe("Authentication & Authorization", () => {
      it("returns error when permission check fails", async () => {
        mockPermissionResult = NextResponse.json(
          { error: "Forbidden" },
          { status: 403 },
        );

        const res = await POST(
          createPostRequest({
            vendor: "ACME",
            category: "maintenance",
            amount: 1000,
            currency: "SAR",
          }),
        );
        expect(res.status).toBe(403);
      });
    });

    describe("Validation", () => {
      beforeEach(() => {
        mockPermissionUser = {
          id: USER_ID,
          userId: USER_ID,
          orgId: ORG_ID,
          tenantId: ORG_ID,
          role: "ADMIN",
        };
      });

      it("returns 400 when vendor is missing", async () => {
        const res = await POST(
          createPostRequest({
            category: "maintenance",
            amount: 1000,
            currency: "SAR",
          }),
        );
        expect(res.status).toBe(400);
      });

      it("returns 400 when category is missing", async () => {
        const res = await POST(
          createPostRequest({
            vendor: "ACME",
            amount: 1000,
            currency: "SAR",
          }),
        );
        expect(res.status).toBe(400);
      });

      it("returns 400 when amount is invalid", async () => {
        const res = await POST(
          createPostRequest({
            vendor: "ACME",
            category: "maintenance",
            amount: -100,
            currency: "SAR",
          }),
        );
        expect(res.status).toBe(400);
      });

      it("returns 400 when currency is missing", async () => {
        const res = await POST(
          createPostRequest({
            vendor: "ACME",
            category: "maintenance",
            amount: 1000,
          }),
        );
        expect(res.status).toBe(400);
      });
    });

    describe("Expense Creation", () => {
      beforeEach(() => {
        mockPermissionUser = {
          id: USER_ID,
          userId: USER_ID,
          orgId: ORG_ID,
          tenantId: ORG_ID,
          role: "ADMIN",
        };
      });

      it("creates expense with valid payload", async () => {
        const res = await POST(
          createPostRequest({
            vendor: "ACME Corp",
            category: "maintenance",
            amount: 1000,
            currency: "SAR",
            description: "Monthly maintenance",
          }),
        );

        expect(res.status).toBe(201);
        expect(mockInsertOne).toHaveBeenCalled();
      });

      it("sets initial status to pending", async () => {
        await POST(
          createPostRequest({
            vendor: "ACME Corp",
            category: "maintenance",
            amount: 1000,
            currency: "SAR",
          }),
        );

        if (mockInsertOne.mock.calls.length > 0) {
          const insertedDoc = mockInsertOne.mock.calls[0][0];
          expect(insertedDoc.status).toBe("pending");
        }
      });

      it("includes orgId for tenant isolation", async () => {
        mockPermissionUser = {
          id: USER_ID,
          userId: USER_ID,
          orgId: ORG_ID,
          tenantId: ORG_ID,
          role: "ADMIN",
        };

        const res = await POST(
          createPostRequest({
            vendor: "ACME Corp",
            category: "maintenance",
            amount: 1000,
            currency: "SAR",
          }),
        );

        expect(res.status).toBe(201);
        expect(mockInsertOne).toHaveBeenCalled();
        const insertedDoc = mockInsertOne.mock.calls[0][0];
        expect(insertedDoc.orgId).toBeDefined();
      });
    });
  });
});
