/**
 * @fileoverview Tests for GET/POST /api/fm/finance/budgets
 * @description FM Finance budgets - department budget management
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// ----- Mock Setup -----
const ORG_ID = new ObjectId().toHexString();
const USER_ID = new ObjectId().toHexString();

type MockPermissionUser = {
  id: string;
  userId: string;
  orgId: string;
  tenantId: string;
  role: string;
  isSuperAdmin?: boolean;
} | null;

let mockPermissionUser: MockPermissionUser = null;
let mockPermissionResult: null | NextResponse = null;
let mockBudgets: Record<string, unknown>[] = [];
let mockInsertedDoc: Record<string, unknown> | null = null;

vi.mock("@/app/api/fm/permissions", () => ({
  requireFmPermission: vi.fn(async () => {
    if (mockPermissionResult) return mockPermissionResult;
    return mockPermissionUser;
  }),
}));

vi.mock("@/app/api/fm/utils/tenant", () => ({
  resolveTenantId: vi.fn((_req, orgId: string) => {
    if (!orgId) return { error: NextResponse.json({ error: "Tenant required" }, { status: 400 }) };
    return { tenantId: orgId };
  }),
  buildTenantFilter: vi.fn((tenantId: string) => ({ orgId: tenantId })),
  isCrossTenantMode: vi.fn((tenantId: string) => tenantId === "*"),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn(async () => ({
    collection: vi.fn(() => ({
      find: vi.fn(() => ({
        sort: vi.fn(() => ({
          skip: vi.fn(() => ({
            limit: vi.fn(() => ({
              toArray: vi.fn(async () => mockBudgets),
            })),
          })),
        })),
      })),
      countDocuments: vi.fn(async () => mockBudgets.length),
      insertOne: vi.fn(async (doc: Record<string, unknown>) => {
        mockInsertedDoc = doc;
        return { insertedId: doc._id };
      }),
    })),
  })),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

vi.mock("@/app/api/fm/errors", () => ({
  FMErrors: {
    internalError: vi.fn(() =>
      NextResponse.json({ success: false, error: "Internal error" }, { status: 500 }),
    ),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// ----- Import Route After Mocks -----
import { GET, POST } from "@/app/api/fm/finance/budgets/route";

// ----- Helpers -----
function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/fm/finance/budgets");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), { method: "GET" });
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/fm/finance/budgets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ----- Tests -----
describe("GET /api/fm/finance/budgets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissionUser = {
      id: USER_ID,
      userId: USER_ID,
      orgId: ORG_ID,
      tenantId: ORG_ID,
      role: "ADMIN",
    };
    mockPermissionResult = null;
    mockBudgets = [
      {
        _id: new ObjectId(),
        orgId: ORG_ID,
        name: "IT Budget",
        department: "IT",
        allocated: 100000,
        currency: "SAR",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        orgId: ORG_ID,
        name: "HR Budget",
        department: "HR",
        allocated: 50000,
        currency: "SAR",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  });

  afterEach(() => {
    mockPermissionUser = null;
    mockPermissionResult = null;
    mockBudgets = [];
  });

  describe("Authentication", () => {
    it("returns permission error when not authorized", async () => {
      mockPermissionResult = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
      const res = await GET(createGetRequest());
      expect(res.status).toBe(401);
    });

    it("returns 403 when no FINANCE:VIEW permission", async () => {
      mockPermissionResult = NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
      const res = await GET(createGetRequest());
      expect(res.status).toBe(403);
    });
  });

  describe("Query Parameters", () => {
    it("accepts page parameter", async () => {
      const res = await GET(createGetRequest({ page: "2" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination.page).toBe(2);
    });

    it("accepts limit parameter", async () => {
      const res = await GET(createGetRequest({ limit: "10" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination.limit).toBe(10);
    });

    it("clamps limit to max 100", async () => {
      const res = await GET(createGetRequest({ limit: "500" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination.limit).toBeLessThanOrEqual(100);
    });

    it("accepts search query", async () => {
      const res = await GET(createGetRequest({ q: "IT" }));
      expect(res.status).toBe(200);
    });
  });

  describe("Response Format", () => {
    it("returns success with data array", async () => {
      const res = await GET(createGetRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("returns pagination metadata", async () => {
      const res = await GET(createGetRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination).toBeDefined();
      expect(body.pagination.page).toBeDefined();
      expect(body.pagination.limit).toBeDefined();
      expect(body.pagination.total).toBeDefined();
      expect(body.pagination.totalPages).toBeDefined();
    });

    it("maps budget documents correctly", async () => {
      const res = await GET(createGetRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      if (body.data.length > 0) {
        const budget = body.data[0];
        expect(budget.id).toBeDefined();
        expect(budget.name).toBe("IT Budget");
        expect(budget.department).toBe("IT");
        expect(budget.allocated).toBe(100000);
        expect(budget.currency).toBe("SAR");
      }
    });
  });
});

describe("POST /api/fm/finance/budgets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissionUser = {
      id: USER_ID,
      userId: USER_ID,
      orgId: ORG_ID,
      tenantId: ORG_ID,
      role: "ADMIN",
    };
    mockPermissionResult = null;
    mockInsertedDoc = null;
  });

  afterEach(() => {
    mockPermissionUser = null;
    mockPermissionResult = null;
    mockInsertedDoc = null;
  });

  describe("Authentication", () => {
    it("returns permission error when not authorized", async () => {
      mockPermissionResult = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
      const res = await POST(
        createPostRequest({
          name: "Test Budget",
          department: "Engineering",
          allocated: 10000,
          currency: "SAR",
        }),
      );
      expect(res.status).toBe(401);
    });

    it("returns 403 when no FINANCE:CREATE permission", async () => {
      mockPermissionResult = NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
      const res = await POST(
        createPostRequest({
          name: "Test Budget",
          department: "Engineering",
          allocated: 10000,
          currency: "SAR",
        }),
      );
      expect(res.status).toBe(403);
    });
  });

  describe("Validation", () => {
    it("returns 400 when name missing", async () => {
      const res = await POST(
        createPostRequest({
          department: "Engineering",
          allocated: 10000,
          currency: "SAR",
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Name");
    });

    it("returns 400 when department missing", async () => {
      const res = await POST(
        createPostRequest({
          name: "Test Budget",
          allocated: 10000,
          currency: "SAR",
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Department");
    });

    it("returns 400 when allocated is not positive", async () => {
      const res = await POST(
        createPostRequest({
          name: "Test Budget",
          department: "Engineering",
          allocated: -100,
          currency: "SAR",
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("amount");
    });

    it("returns 400 when currency missing", async () => {
      const res = await POST(
        createPostRequest({
          name: "Test Budget",
          department: "Engineering",
          allocated: 10000,
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Currency");
    });
  });

  describe("Tenant Isolation", () => {
    it("assigns orgId from resolved tenant", async () => {
      const res = await POST(
        createPostRequest({
          name: "New Budget",
          department: "Engineering",
          allocated: 50000,
          currency: "SAR",
        }),
      );
      expect(res.status).toBe(201);
      expect(mockInsertedDoc).toBeDefined();
      expect(mockInsertedDoc?.orgId).toBe(ORG_ID);
    });

    it("rejects cross-tenant mode for POST", async () => {
      mockPermissionUser = {
        id: USER_ID,
        userId: USER_ID,
        orgId: "*",
        tenantId: "*",
        role: "ADMIN",
      };

      const res = await POST(
        createPostRequest({
          name: "Cross Tenant Budget",
          department: "Finance",
          allocated: 25000,
          currency: "SAR",
        }),
      );

      expect(res.status).toBe(400);
    });
  });

  describe("Successful Creation", () => {
    it("returns 201 with created budget", async () => {
      const res = await POST(
        createPostRequest({
          name: "New Budget",
          department: "Engineering",
          allocated: 50000,
          currency: "SAR",
        }),
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.name).toBe("New Budget");
      expect(body.data.department).toBe("Engineering");
      expect(body.data.allocated).toBe(50000);
      expect(body.data.currency).toBe("SAR");
    });

    it("sanitizes and trims input", async () => {
      const res = await POST(
        createPostRequest({
          name: "  Budget Name  ",
          department: "  Engineering  ",
          allocated: 50000,
          currency: "  sar  ",
        }),
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.name).toBe("Budget Name");
      expect(body.data.department).toBe("Engineering");
      expect(body.data.currency).toBe("SAR");
    });
  });
});
