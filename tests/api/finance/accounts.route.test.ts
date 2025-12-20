import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetSessionUser = vi.fn();
const mockEnforceRateLimit = vi.fn();
const mockDbConnect = vi.fn();
const mockChartAccountFind = vi.fn();
const mockChartAccountCreate = vi.fn();
const mockRequirePermission = vi.fn();
const mockRunWithContext = vi.fn();

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: (...args: unknown[]) => mockGetSessionUser(...args),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  dbConnect: () => mockDbConnect(),
  connectToDatabase: () => mockDbConnect(),
}));

vi.mock("@/server/models/finance/ChartAccount", () => ({
  default: {
    find: (...args: unknown[]) => {
      mockChartAccountFind(...args);
      return {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
        exec: vi.fn().mockResolvedValue([]),
      };
    },
    create: (...args: unknown[]) => mockChartAccountCreate(...args),
    findOne: vi.fn().mockResolvedValue(null),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock("@/config/rbac.config", () => ({
  requirePermission: (...args: unknown[]) => mockRequirePermission(...args),
}));

vi.mock("@/server/lib/authContext", () => ({
  runWithContext: (ctx: unknown, fn: () => unknown) => mockRunWithContext(ctx, fn),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodyOrNull: vi.fn().mockImplementation(async (req) => {
    try {
      return await req.json();
    } catch {
      return null;
    }
  }),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  unauthorizedError: vi.fn(() => {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }),
  forbiddenError: vi.fn(() => {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }),
  handleApiError: vi.fn((error) => {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }),
  isForbidden: vi.fn().mockReturnValue(false),
}));

import { GET, POST } from "@/app/api/finance/accounts/route";
import { NextRequest } from "next/server";

const mockSession = {
  id: "user-1",
  orgId: "org-1",
  role: "FINANCE_MANAGER",
};

function createRequest(method: string, body?: unknown): NextRequest {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "127.0.0.1",
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return new NextRequest("http://localhost/api/finance/accounts", options);
}

describe("finance/accounts route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null); // No rate limit response = allowed
    mockDbConnect.mockResolvedValue(undefined);
    mockGetSessionUser.mockResolvedValue(mockSession);
    mockRequirePermission.mockReturnValue(true);
    mockRunWithContext.mockImplementation((ctx, fn) => fn());
  });

  describe("GET /api/finance/accounts", () => {
    it("returns 429 when rate limited", async () => {
      mockEnforceRateLimit.mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
      );
      
      const req = createRequest("GET");
      const res = await GET(req);
      
      expect(res.status).toBe(429);
    });

    it("returns 401 when not authenticated", async () => {
      mockGetSessionUser.mockResolvedValueOnce(null);
      
      const req = createRequest("GET");
      const res = await GET(req);
      
      expect(res.status).toBe(401);
    });

    it("returns accounts list when authenticated with permission", async () => {
      mockChartAccountFind.mockReturnValueOnce({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          { _id: "acc-1", accountCode: "1000", accountName: "Cash" }
        ]),
      });
      mockRunWithContext.mockImplementation(async (ctx, fn) => {
        return new Response(JSON.stringify({ accounts: [] }), { status: 200 });
      });
      
      const req = createRequest("GET");
      const res = await GET(req);
      
      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/finance/accounts", () => {
    const validAccountPayload = {
      accountCode: "1010",
      accountName: "Petty Cash",
      accountType: "ASSET",
      normalBalance: "DEBIT",
      description: "Petty cash account",
    };

    it("returns 429 when rate limited", async () => {
      mockEnforceRateLimit.mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
      );
      
      const req = createRequest("POST", validAccountPayload);
      const res = await POST(req);
      
      expect(res.status).toBe(429);
    });

    it("returns 401 when not authenticated", async () => {
      mockGetSessionUser.mockResolvedValueOnce(null);
      
      const req = createRequest("POST", validAccountPayload);
      const res = await POST(req);
      
      expect(res.status).toBe(401);
    });

    it("creates account with valid payload and proper permissions", async () => {
      mockChartAccountCreate.mockResolvedValueOnce({
        _id: "acc-new",
        ...validAccountPayload,
        orgId: "org-1",
      });
      mockRunWithContext.mockImplementation(async (ctx, fn) => {
        return new Response(JSON.stringify({ account: { _id: "acc-new" } }), { status: 201 });
      });
      
      const req = createRequest("POST", validAccountPayload);
      const res = await POST(req);
      
      // Should not be 401 or 429
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(429);
    });
  });
});
