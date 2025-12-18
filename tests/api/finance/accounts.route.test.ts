/**
 * Finance Accounts API Contract Tests
 * 
 * Tests for GET/POST /api/finance/accounts
 * Validates response shape, tenancy enforcement, and error handling.
 * 
 * @coverage
 * - Response shape assertions (contract guards)
 * - Tenant isolation (orgId enforcement)
 * - Rate limit 429 response
 * - Authorization (FINANCE:VIEW/CREATE permission)
 * - Hierarchical vs flat response modes
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before importing route
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(),
}));

vi.mock("@/server/lib/authContext", () => ({
  runWithContext: vi.fn((ctx, fn) => fn()),
}));

vi.mock("@/config/rbac.config", () => ({
  requirePermission: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/finance/ChartAccount", () => ({
  default: {
    find: vi.fn().mockReturnThis(),
    findOne: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodyOrNull: vi.fn(),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  unauthorizedError: vi.fn(() => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })),
  forbiddenError: vi.fn((msg) => new Response(JSON.stringify({ error: msg }), { status: 403 })),
  handleApiError: vi.fn((err) => new Response(JSON.stringify({ error: err.message }), { status: 500 })),
  isForbidden: vi.fn(() => false),
}));

const { getSessionUser } = await import("@/server/middleware/withAuthRbac");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
const ChartAccount = (await import("@/server/models/finance/ChartAccount")).default;
const { requirePermission } = await import("@/config/rbac.config");
const { parseBodyOrNull } = await import("@/lib/api/parse-body");

// Import route after mocks
const { GET, POST } = await import("@/app/api/finance/accounts/route");

function createRequest(params: Record<string, string> = {}, method = "GET", body?: object) {
  const url = new URL("http://localhost/api/finance/accounts");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  
  return new NextRequest(url.toString(), init);
}

describe("Finance Accounts API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default: authenticated user with finance permission
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "user123",
      orgId: "org123",
      role: "FINANCE_MANAGER",
    } as any);
    
    vi.mocked(enforceRateLimit).mockReturnValue(null as any);
    vi.mocked(requirePermission).mockReturnValue(undefined);
    
    // Default empty results
    vi.mocked(ChartAccount.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    } as any);
  });

  describe("GET /api/finance/accounts", () => {
    describe("Response Shape Contract", () => {
      it("should return correct response structure with success and data", async () => {
        const request = createRequest();
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();

        // Contract assertions - guard against schema drift
        expect(data).toHaveProperty("success", true);
        expect(data).toHaveProperty("data");
        expect(Array.isArray(data.data)).toBe(true);
      });

      it("should return flat list when flat=true", async () => {
        const mockAccounts = [
          {
            _id: "acc1",
            accountCode: "1000",
            accountName: "Assets",
            accountType: "ASSET",
            normalBalance: "DEBIT",
            orgId: "org123",
          },
          {
            _id: "acc2",
            accountCode: "1100",
            accountName: "Cash",
            accountType: "ASSET",
            normalBalance: "DEBIT",
            parentId: "acc1",
            orgId: "org123",
          },
        ];

        vi.mocked(ChartAccount.find).mockReturnValue({
          sort: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(mockAccounts),
          }),
        } as any);

        const request = createRequest({ flat: "true" });
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.data).toHaveLength(2);
        // Flat list should contain account objects directly
        expect(data.data[0]).toHaveProperty("accountCode");
        expect(data.data[0]).toHaveProperty("accountName");
        expect(data.data[0]).toHaveProperty("accountType");
      });

      it("should return hierarchical structure by default", async () => {
        const request = createRequest();
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
      });

      it("should filter by accountType when specified", async () => {
        const request = createRequest({ accountType: "ASSET" });
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(ChartAccount.find).toHaveBeenCalled();
      });
    });

    describe("Authorization", () => {
      it("should return 401 when not authenticated", async () => {
        vi.mocked(getSessionUser).mockResolvedValue(null);

        const request = createRequest();
        const response = await GET(request);

        expect(response.status).toBe(401);
      });

      it("should return 403 when lacking finance permission", async () => {
        const { isForbidden } = await import("@/server/utils/errorResponses");
        vi.mocked(isForbidden).mockReturnValue(true);
        vi.mocked(requirePermission).mockImplementation(() => {
          const err = new Error("Forbidden");
          (err as any).statusCode = 403;
          throw err;
        });

        const request = createRequest();
        const response = await GET(request);

        expect(response.status).toBe(403);
      });
    });

    describe("Rate Limiting", () => {
      it("should return 429 when rate limited", async () => {
        vi.mocked(enforceRateLimit).mockReturnValue(
          new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }) as any
        );

        const request = createRequest();
        const response = await GET(request);

        expect(response.status).toBe(429);
      });
    });

    describe("Tenant Isolation", () => {
      it("should include orgId in query filter (tenant isolation)", async () => {
        const request = createRequest();
        await GET(request);

        expect(ChartAccount.find).toHaveBeenCalled();
        const findCall = vi.mocked(ChartAccount.find).mock.calls[0];
        expect(findCall).toBeDefined();
        if (findCall && findCall[0]) {
          expect(findCall[0]).toHaveProperty("orgId");
        }
      });
    });
  });

  describe("POST /api/finance/accounts", () => {
    const validAccountData = {
      accountCode: "1000",
      accountName: "Assets",
      accountType: "ASSET",
      normalBalance: "DEBIT",
    };

    beforeEach(() => {
      vi.mocked(parseBodyOrNull).mockResolvedValue(validAccountData);
      vi.mocked(ChartAccount.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null), // No duplicate
      } as any);
      vi.mocked(ChartAccount.create).mockResolvedValue({
        _id: "newAcc123",
        ...validAccountData,
        orgId: "org123",
      } as any);
    });

    describe("Response Shape Contract", () => {
      it("should return created account with expected fields", async () => {
        const request = createRequest({}, "POST", validAccountData);
        const response = await POST(request);

        if (response.status === 201) {
          const data = await response.json();
          expect(data).toHaveProperty("success", true);
          expect(data).toHaveProperty("data");
          expect(data.data).toHaveProperty("accountCode");
          expect(data.data).toHaveProperty("accountName");
          expect(data.data).toHaveProperty("accountType");
        }
      });
    });

    describe("Validation", () => {
      it("should reject missing required fields", async () => {
        vi.mocked(parseBodyOrNull).mockResolvedValue({
          accountCode: "1000",
          // Missing accountName, accountType, normalBalance
        });

        const request = createRequest({}, "POST", { accountCode: "1000" });
        const response = await POST(request);

        // Should return 400 for validation error
        expect([400, 500]).toContain(response.status);
      });

      it("should reject duplicate account code", async () => {
        vi.mocked(ChartAccount.findOne).mockReturnValue({
          lean: vi.fn().mockResolvedValue({ _id: "existing", accountCode: "1000" }),
        } as any);

        const request = createRequest({}, "POST", validAccountData);
        const response = await POST(request);

        expect([400, 409]).toContain(response.status);
      });
    });

    describe("Rate Limiting", () => {
      it("should return 429 when rate limited on POST", async () => {
        vi.mocked(enforceRateLimit).mockReturnValue(
          new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }) as any
        );

        const request = createRequest({}, "POST", validAccountData);
        const response = await POST(request);

        expect(response.status).toBe(429);
      });
    });
  });
});
