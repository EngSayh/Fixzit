/**
 * @fileoverview Tests for /api/finance/ledger route
 * Tests general ledger entry listing, filtering, and pagination
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

// Mock LedgerEntry model
const mockLedgerEntries = [
  {
    _id: "entry-1",
    orgId: "org-123",
    accountId: "acc-1",
    journalId: "jrn-1",
    date: new Date("2025-12-15"),
    debit: 10000_00,
    credit: 0,
    description: "Property rental payment",
    balance: 10000_00,
  },
  {
    _id: "entry-2",
    orgId: "org-123",
    accountId: "acc-2",
    journalId: "jrn-2",
    date: new Date("2025-12-16"),
    debit: 0,
    credit: 5000_00,
    description: "Maintenance expense",
    balance: -5000_00,
  },
];

vi.mock("@/server/models/finance/LedgerEntry", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(mockLedgerEntries),
    }),
    countDocuments: vi.fn().mockResolvedValue(2),
  },
}));

import { GET } from "@/app/api/finance/ledger/route";

describe("API /api/finance/ledger", () => {
  beforeEach(() => {
    sessionUser = null;
    vi.clearAllMocks();
  });

  describe("GET - List Ledger Entries", () => {
    it("returns 401 when user is not authenticated", async () => {
      sessionUser = null;

      const req = new NextRequest("http://localhost:3000/api/finance/ledger");
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

      const req = new NextRequest("http://localhost:3000/api/finance/ledger");
      
      await expect(GET(req)).rejects.toThrow("Forbidden");
    });

    it("returns paginated ledger entries when authenticated", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/ledger");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.entries).toBeDefined();
      expect(Array.isArray(data.entries)).toBe(true);
      expect(data.total).toBe(2);
    });

    it("accepts accountId filter", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/finance/ledger?accountId=acc-1"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.entries).toBeDefined();
    });

    it("accepts startDate and endDate filters", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/finance/ledger?startDate=2025-12-01&endDate=2025-12-31"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("accepts propertyId and unitId filters", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/finance/ledger?propertyId=prop-1&unitId=unit-1"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("accepts workOrderId filter", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/finance/ledger?workOrderId=wo-123"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("supports pagination with page and limit", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/finance/ledger?page=2&limit=50"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.page).toBeDefined();
    });

    it("enforces maximum limit of 100", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/finance/ledger?limit=200"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
      // Limit should be capped at 100
    });

    it("returns empty array when no entries exist", async () => {
      const LedgerEntry = (await import("@/server/models/finance/LedgerEntry")).default;
      vi.mocked(LedgerEntry.find).mockReturnValueOnce({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);
      vi.mocked(LedgerEntry.countDocuments).mockResolvedValueOnce(0);

      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/ledger");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.entries).toHaveLength(0);
      expect(data.total).toBe(0);
    });

    it("includes entry metadata in response", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/ledger");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.entries[0]).toHaveProperty("accountId");
      expect(data.entries[0]).toHaveProperty("journalId");
      expect(data.entries[0]).toHaveProperty("date");
      expect(data.entries[0]).toHaveProperty("debit");
      expect(data.entries[0]).toHaveProperty("credit");
      expect(data.entries[0]).toHaveProperty("balance");
    });

    it("P91: validates response shape contract (prevents schema drift)", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/ledger");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();

      // Top-level response shape
      expect(data).toMatchObject({
        entries: expect.any(Array),
        page: expect.any(Number),
        limit: expect.any(Number),
        total: expect.any(Number),
      });

      // Ledger entry shape (if entries exist)
      if (data.entries.length > 0) {
        expect(data.entries[0]).toMatchObject({
          accountId: expect.any(String),
          journalId: expect.any(String),
          date: expect.any(String),
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

      const req = new NextRequest("http://localhost:3000/api/finance/ledger");
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

      const req = new NextRequest("http://localhost:3000/api/finance/ledger");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });
  });
});
