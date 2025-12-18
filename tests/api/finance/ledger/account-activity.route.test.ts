/**
 * @fileoverview Tests for /api/finance/ledger/account-activity/[accountId] route
 * Tests account activity report with filtering and pagination
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

type SessionUser = {
  id?: string;
  orgId?: string;
  email?: string;
  role?: string;
};
let sessionUser: SessionUser | null = null;

// Mock auth
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(async () => sessionUser),
}));

// Mock authContext
vi.mock("@/server/lib/authContext", () => ({
  runWithContext: vi.fn(async (_ctx, fn) => fn()),
}));

// Mock RBAC
vi.mock("@/config/rbac.config", () => ({
  requirePermission: vi.fn((role, perm) => {
    if (role !== "FINANCE_MANAGER" && role !== "SUPER_ADMIN") {
      const error = new Error("Forbidden");
      (error as any).statusCode = 403;
      throw error;
    }
  }),
}));

// Mock rate limit
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

// Mock database
vi.mock("@/lib/mongodb-unified", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

// Mock models
const mockAccount = {
  _id: "acc-1",
  orgId: "org-123",
  code: "1000",
  name: "Cash",
  type: "ASSET",
  balance: 50000_00,
};

const mockEntries = [
  {
    _id: "entry-1",
    orgId: "org-123",
    accountId: "acc-1",
    date: new Date("2025-12-15"),
    debit: 10000_00,
    credit: 0,
    balance: 10000_00,
    description: "Rental payment",
  },
];

vi.mock("@/server/models/finance/Account", () => ({
  default: {
    findById: vi.fn().mockResolvedValue(mockAccount),
  },
}));

vi.mock("@/server/models/finance/LedgerEntry", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(mockEntries),
    }),
    countDocuments: vi.fn().mockResolvedValue(1),
  },
}));

// Import route dynamically
let GET: any;

describe("API /api/finance/ledger/account-activity/[accountId]", () => {
  beforeEach(async () => {
    sessionUser = null;
    vi.clearAllMocks();
    
    // Dynamic import to avoid module caching issues
    const routeModule = await import("@/app/api/finance/ledger/account-activity/[accountId]/route");
    GET = routeModule.GET;
  });

  describe("GET - Account Activity Report", () => {
    it("returns 401 when user is not authenticated", async () => {
      sessionUser = null;

      const req = new NextRequest("http://localhost:3000/api/finance/ledger/account-activity/acc-1");
      const res = await GET(req, { params: { accountId: "acc-1" } });

      expect(res.status).toBe(401);
    });

    it("returns 403 when user lacks FINANCE permission", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "user@test.com",
        role: "PROPERTY_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/ledger/account-activity/acc-1");
      
      await expect(GET(req, { params: { accountId: "acc-1" } })).rejects.toThrow("Forbidden");
    });

    it("returns account activity when authenticated", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/ledger/account-activity/acc-1");
      const res = await GET(req, { params: { accountId: "acc-1" } });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.account).toBeDefined();
      expect(data.entries).toBeDefined();
      expect(Array.isArray(data.entries)).toBe(true);
    });

    it("returns 404 when account does not exist", async () => {
      const ChartAccount = (await import("@/server/models/finance/ChartAccount")).default;
      vi.mocked(ChartAccount.findById).mockResolvedValueOnce(null);

      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/ledger/account-activity/invalid");
      const res = await GET(req, { params: { accountId: "invalid" } });

      expect(res.status).toBe(404);
    });

    it("accepts startDate and endDate filters", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/finance/ledger/account-activity/acc-1?startDate=2025-12-01&endDate=2025-12-31"
      );
      const res = await GET(req, { params: { accountId: "acc-1" } });

      expect(res.status).toBe(200);
    });

    it("supports pagination", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/finance/ledger/account-activity/acc-1?page=2&limit=50"
      );
      const res = await GET(req, { params: { accountId: "acc-1" } });

      expect(res.status).toBe(200);
    });

    it("includes account metadata in response", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/ledger/account-activity/acc-1");
      const res = await GET(req, { params: { accountId: "acc-1" } });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.account).toHaveProperty("code");
      expect(data.account).toHaveProperty("name");
      expect(data.account).toHaveProperty("type");
      expect(data.account).toHaveProperty("balance");
    });

    it("calculates running balance in entries", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/ledger/account-activity/acc-1");
      const res = await GET(req, { params: { accountId: "acc-1" } });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.entries[0]).toHaveProperty("balance");
    });

    it("enforces rate limiting", async () => {
      const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
      vi.mocked(enforceRateLimit).mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }) as any
      );

      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/ledger/account-activity/acc-1");
      const res = await GET(req, { params: { accountId: "acc-1" } });

      expect(res.status).toBe(429);
    });
  });
});
