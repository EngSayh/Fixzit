/**
 * @fileoverview Tests for /api/finance/ledger/trial-balance route
 * Tests trial balance report generation, validation, and authorization
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Types } from "mongoose";

type SessionUser = {
  id?: string;
  orgId?: string;
  email?: string;
  role?: string;
};
let sessionUser: SessionUser | null = null;

// Mock auth - UnauthorizedError must be defined inline due to hoisting
vi.mock("@/server/middleware/withAuthRbac", () => {
  class UnauthorizedError extends Error {
    constructor(message = "Unauthorized") {
      super(message);
      this.name = "UnauthorizedError";
    }
  }
  return {
    getSessionUser: vi.fn(async () => sessionUser),
    UnauthorizedError,
  };
});

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
vi.mock("@/server/finance/reporting.service", () => ({
  trialBalance: vi.fn().mockResolvedValue({
    rows: [
      {
        accountId: new Types.ObjectId("507f1f77bcf86cd799439011"),
        code: "1000",
        accountCode: "1000",
        name: "Cash",
        accountName: "Cash",
        type: "ASSET",
        debit: Types.Decimal128.fromString("50000.00"),
        credit: Types.Decimal128.fromString("0"),
      },
      {
        accountId: new Types.ObjectId("507f1f77bcf86cd799439012"),
        code: "2000",
        accountCode: "2000",
        name: "Accounts Payable",
        accountName: "Accounts Payable",
        type: "LIABILITY",
        debit: Types.Decimal128.fromString("0"),
        credit: Types.Decimal128.fromString("30000.00"),
      },
    ],
    totDr: 5000000n,
    totCr: 3000000n,
    balanced: false,
  }),
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
        rows: [],
        totDr: 0n,
        totCr: 0n,
        balanced: true,
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

    it("P91: validates response shape contract (prevents schema drift)", async () => {
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

      // Top-level response shape
      expect(data).toMatchObject({
        accounts: expect.any(Array),
        totals: expect.objectContaining({
          totalDebit: expect.any(Number),
          totalCredit: expect.any(Number),
        }),
        metadata: expect.any(Object),
      });

      // Account entry shape (if accounts exist)
      if (data.accounts.length > 0) {
        expect(data.accounts[0]).toMatchObject({
          accountCode: expect.any(String),
          accountName: expect.any(String),
          debit: expect.any(Number),
          credit: expect.any(Number),
          balance: expect.any(Number),
        });
      }
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
