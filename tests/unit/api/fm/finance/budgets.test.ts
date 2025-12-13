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
const UNIT_ID = new ObjectId().toHexString();

type MockPermissionUser = {
  id: string;
  userId: string;
  orgId: string;
  tenantId: string;
  role: string;
  isSuperAdmin?: boolean;
  units?: string[];
  unitId?: string;
} | null;

let mockPermissionUser: MockPermissionUser = null;
let mockPermissionResult: null | NextResponse = null;
let mockBudgets: Record<string, unknown>[] = [];
let mockInsertedDoc: Record<string, unknown> | null = null;
let lastFindQuery: Record<string, unknown> | null = null;
let mockTenantId: string | null = ORG_ID;

const filterBudgets = (query: Record<string, unknown> = {}) => {
  const unitFilter = (query.unitId as { $in?: string[] } | undefined)?.$in;
  if (!unitFilter || unitFilter.length === 0) return mockBudgets;
  const allowed = new Set(unitFilter.map((id) => id.toString()));
  return mockBudgets.filter((budget) => {
    const unitId = (budget.unitId ?? "").toString();
    return allowed.has(unitId);
  });
};

vi.mock("@/app/api/fm/permissions", () => ({
  requireFmPermission: vi.fn(async () => {
    if (mockPermissionResult) return mockPermissionResult;
    return mockPermissionUser;
  }),
}));

vi.mock("@/app/api/fm/utils/tenant", () => ({
  resolveTenantId: vi.fn((_req, orgId: string) => {
    if (!mockTenantId && !orgId) {
      return { error: NextResponse.json({ error: "Tenant required" }, { status: 400 }) };
    }
    return { tenantId: mockTenantId ?? orgId };
  }),
  buildTenantFilter: vi.fn(
    (tenantId: string, _fieldName: string = "orgId", options?: { unitIds?: string[] }) => {
      const filter: Record<string, unknown> = { orgId: tenantId };
      if (options?.unitIds?.length) {
        filter.unitId = { $in: options.unitIds };
      }
      return filter;
    },
  ),
  isCrossTenantMode: vi.fn((tenantId: string) => tenantId === "*"),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn(async () => ({
    collection: vi.fn(() => ({
      find: vi.fn((query: Record<string, unknown>) => {
        lastFindQuery = query;
        const filtered = filterBudgets(query);
        return {
          sort: vi.fn(() => ({
            skip: vi.fn(() => ({
              limit: vi.fn(() => ({
                toArray: vi.fn(async () => filtered),
              })),
            })),
          })),
        };
      }),
      countDocuments: vi.fn(async (query: Record<string, unknown>) => filterBudgets(query).length),
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

function createPostRequest(
  body: Record<string, unknown>,
  options?: { includeUnitId?: boolean },
): NextRequest {
  const payload = { ...body };
  if (options?.includeUnitId !== false) {
    payload.unitId = payload.unitId ?? UNIT_ID;
  }
  return new NextRequest("http://localhost/api/fm/finance/budgets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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
      units: [UNIT_ID],
    };
    mockPermissionResult = null;
    mockTenantId = ORG_ID;
    lastFindQuery = null;
    mockBudgets = [
      {
        _id: new ObjectId(),
        orgId: ORG_ID,
        unitId: UNIT_ID,
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
        unitId: UNIT_ID,
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
    lastFindQuery = null;
    mockTenantId = ORG_ID;
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

  describe("Unit Scoping", () => {
    it("applies unit filter to queries", async () => {
      const res = await GET(createGetRequest());
      expect(res.status).toBe(200);
      expect(lastFindQuery?.unitId).toEqual({ $in: [UNIT_ID] });
    });

    it("rejects access to disallowed unit", async () => {
      const res = await GET(createGetRequest({ unitId: "OTHER_UNIT" }));
      expect(res.status).toBe(403);
    });

    it("requires explicit unit when multiple units assigned", async () => {
      mockPermissionUser = {
        id: USER_ID,
        userId: USER_ID,
        orgId: ORG_ID,
        tenantId: ORG_ID,
        role: "ADMIN",
        units: ["UNIT_A", "UNIT_B"],
      };

      const res = await GET(createGetRequest());
      expect(res.status).toBe(400);
    });

    it("rejects cross-tenant super admin listing without tenant/unit context", async () => {
      mockTenantId = "*";
      mockPermissionUser = {
        id: USER_ID,
        userId: USER_ID,
        orgId: ORG_ID,
        tenantId: ORG_ID,
        role: "ADMIN",
        isSuperAdmin: true,
      };

      const res = await GET(createGetRequest());
      expect(res.status).toBe(400);
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
      units: [UNIT_ID],
    };
    mockPermissionResult = null;
    mockInsertedDoc = null;
    mockTenantId = ORG_ID;
  });

  afterEach(() => {
    mockPermissionUser = null;
    mockPermissionResult = null;
    mockInsertedDoc = null;
    mockTenantId = ORG_ID;
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
      expect(mockInsertedDoc?.unitId).toBe(UNIT_ID);
    });

    it("rejects cross-tenant mode for POST", async () => {
      mockTenantId = "*";

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

    it("rejects unit outside allowed scope", async () => {
      const res = await POST(
        createPostRequest(
          {
            name: "New Budget",
            department: "Engineering",
            allocated: 50000,
            currency: "SAR",
            unitId: "OTHER_UNIT",
          },
          { includeUnitId: false },
        ),
      );

      expect(res.status).toBe(403);
    });

    it("requires unit when multiple units assigned", async () => {
      mockPermissionUser = {
        id: USER_ID,
        userId: USER_ID,
        orgId: ORG_ID,
        tenantId: ORG_ID,
        role: "ADMIN",
        units: ["UNIT_A", "UNIT_B"],
      };

      const res = await POST(
        createPostRequest(
          {
            name: "New Budget",
            department: "Engineering",
            allocated: 50000,
            currency: "SAR",
          },
          { includeUnitId: false },
        ),
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
      expect(body.data.unitId).toBe(UNIT_ID);
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
      expect(body.data.unitId).toBe(UNIT_ID);
    });
  });
});
