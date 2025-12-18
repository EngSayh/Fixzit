/**
 * @fileoverview Tests for /api/finance/ledger/trial-balance route
 * Tests trial balance report generation, validation, and authorization
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

// Mock trial balance service
const mockTrialBalanceData = {
  accounts: [
    {
      accountId: "acc-1",
      accountCode: "1000",
      accountName: "Cash",
      debit: 50000_00,
      credit: 0,
      balance: 50000_00,
    },
    {
      accountId: "acc-2",
      accountCode: "2000",
      accountName: "Accounts Payable",
      debit: 0,
      credit: 30000_00,
      balance: -30000_00,
    },
  ],
  totals: {
    totalDebit: 50000_00,
    totalCredit: 30000_00,
  },
  metadata: {
    asOfDate: "2025-12-31",
    currency: "SAR",
    orgId: "org-123",
  },
};

vi.mock("@/server/finance/reporting.service", () => ({
  trialBalance: vi.fn().mockResolvedValue(mockTrialBalanceData),
}));

import { GET } from "@/app/api/finance/ledger/trial-balance/route";

describe("API /api/finance/ledger/trial-balance", () => {
  beforeEach(() => {
    sessionUser = null;
    vi.clearAllMocks();
  });

  describe("GET - Trial Balance Report", () => {
    it("returns 401 when user is not authenticated", async () => {
      sessionUser = null;

      const req = new NextRequest("http://localhost:3000/api/finance/ledger/trial-balance");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 403 when user lacks FINANCE permission", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "user@test.com",
        role: "PROPERTY_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/ledger/trial-balance");
      
      await expect(GET(req)).rejects.toThrow("Forbidden");
    });

    it("returns trial balance for current period when authenticated", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/ledger/trial-balance");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.accounts).toBeDefined();
      expect(data.totals).toBeDefined();
      expect(data.totals.totalDebit).toEqual(data.totals.totalCredit); // Trial balance should balance
    });

    it("accepts asOfDate query parameter", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/finance/ledger/trial-balance?asOfDate=2025-06-30"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.metadata.asOfDate).toBeDefined();
    });

    it("accepts year and period query parameters", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/finance/ledger/trial-balance?year=2025&period=6"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("returns empty accounts array when no transactions exist", async () => {
      const { trialBalance } = await import("@/server/finance/reporting.service");
      vi.mocked(trialBalance).mockResolvedValueOnce({
        accounts: [],
        totals: { totalDebit: 0, totalCredit: 0 },
        metadata: { asOfDate: "2025-12-31", currency: "SAR", orgId: "org-123" },
      });

      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/ledger/trial-balance");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.accounts).toHaveLength(0);
      expect(data.totals.totalDebit).toBe(0);
      expect(data.totals.totalCredit).toBe(0);
    });

    it("includes account metadata in response", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/ledger/trial-balance");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.accounts[0]).toHaveProperty("accountCode");
      expect(data.accounts[0]).toHaveProperty("accountName");
      expect(data.accounts[0]).toHaveProperty("debit");
      expect(data.accounts[0]).toHaveProperty("credit");
      expect(data.accounts[0]).toHaveProperty("balance");
    });

    it("enforces rate limiting", async () => {
      const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
      vi.mocked(enforceRateLimit).mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/ledger/trial-balance");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("allows SUPER_ADMIN access", async () => {
      sessionUser = {
        id: "admin-123",
        orgId: "org-123",
        email: "admin@test.com",
        role: "SUPER_ADMIN",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/ledger/trial-balance");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });
  });
});
