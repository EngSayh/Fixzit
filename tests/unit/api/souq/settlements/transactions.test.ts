/**
 * @fileoverview Tests for Souq Settlements Transactions API
 * @route GET /api/souq/settlements/transactions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
const mockBalanceService = vi.hoisted(() => ({
  getTransactionHistory: vi.fn(),
}));

vi.mock("@/services/souq/settlements/balance-service", () => ({
  SellerBalanceService: mockBalanceService,
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn(),
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

let currentSession: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => currentSession),
}));

const ORG_ID = "org_123456789";
const SELLER_ID = "seller_123456789";
const OTHER_SELLER_ID = "seller_987654321";
const ADMIN_ID = "admin_123456789";

function createRequest(params: Record<string, string> = {}): NextRequest {
  const searchParams = new URLSearchParams(params);
  return new NextRequest(
    `http://localhost:3000/api/souq/settlements/transactions?${searchParams.toString()}`,
  );
}

describe("/api/souq/settlements/transactions", () => {
  let GET: typeof import("@/app/api/souq/settlements/transactions/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    currentSession = null;
    mockBalanceService.getTransactionHistory.mockResolvedValue({
      transactions: [],
      total: 0,
    });

    const mod = await import("@/app/api/souq/settlements/transactions/route");
    GET = mod.GET;
  });

  describe("Authentication", () => {
    it("returns 401 when session is missing", async () => {
      currentSession = null;
      const res = await GET(createRequest());
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 403 when orgId is missing", async () => {
      currentSession = { user: { id: SELLER_ID } };
      const res = await GET(createRequest());
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Organization context required");
    });
  });

  describe("Authorization", () => {
    it("allows seller to view own transactions", async () => {
      currentSession = {
        user: { id: SELLER_ID, orgId: ORG_ID, role: "VENDOR" },
      };
      mockBalanceService.getTransactionHistory.mockResolvedValue({
        transactions: [{ id: "tx1", amount: 100 }],
        total: 1,
      });

      const res = await GET(createRequest());
      expect(res.status).toBe(200);
      expect(mockBalanceService.getTransactionHistory).toHaveBeenCalledWith(
        SELLER_ID,
        ORG_ID,
        expect.objectContaining({ limit: 50 }),
      );
    });

    it("returns 404 when seller tries to view other seller transactions", async () => {
      currentSession = {
        user: { id: SELLER_ID, orgId: ORG_ID, role: "VENDOR" },
      };

      const res = await GET(createRequest({ sellerId: OTHER_SELLER_ID }));
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("Transactions not found");
    });

    it("allows admin to view any seller transactions", async () => {
      currentSession = {
        user: { id: ADMIN_ID, orgId: ORG_ID, role: "ADMIN" },
      };
      mockBalanceService.getTransactionHistory.mockResolvedValue({
        transactions: [{ id: "tx1", amount: 100 }],
        total: 1,
      });

      const res = await GET(createRequest({ sellerId: OTHER_SELLER_ID }));
      expect(res.status).toBe(200);
      expect(mockBalanceService.getTransactionHistory).toHaveBeenCalledWith(
        OTHER_SELLER_ID,
        ORG_ID,
        expect.any(Object),
      );
    });

    it("allows finance officer to view any seller transactions", async () => {
      currentSession = {
        user: {
          id: ADMIN_ID,
          orgId: ORG_ID,
          role: "TEAM_MEMBER",
          subRole: "FINANCE_OFFICER",
        },
      };
      mockBalanceService.getTransactionHistory.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      const res = await GET(createRequest({ sellerId: OTHER_SELLER_ID }));
      expect(res.status).toBe(200);
    });

    it("allows super admin with targetOrgId", async () => {
      const targetOrgId = "target_org_123";
      currentSession = {
        user: {
          id: ADMIN_ID,
          orgId: ORG_ID,
          role: "SUPER_ADMIN",
          isSuperAdmin: true,
        },
      };
      mockBalanceService.getTransactionHistory.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      const res = await GET(
        createRequest({ sellerId: OTHER_SELLER_ID, targetOrgId }),
      );
      expect(res.status).toBe(200);
      expect(mockBalanceService.getTransactionHistory).toHaveBeenCalledWith(
        OTHER_SELLER_ID,
        targetOrgId,
        expect.any(Object),
      );
    });

    it("requires targetOrgId for super admin without orgId", async () => {
      currentSession = {
        user: {
          id: ADMIN_ID,
          role: "SUPER_ADMIN",
          isSuperAdmin: true,
        },
      };

      const res = await GET(createRequest());
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("targetOrgId is required for platform admins");
    });
  });

  describe("Filtering & Pagination", () => {
    beforeEach(() => {
      currentSession = {
        user: { id: SELLER_ID, orgId: ORG_ID, role: "VENDOR" },
      };
    });

    it("applies type filter", async () => {
      mockBalanceService.getTransactionHistory.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      await GET(createRequest({ type: "credit" }));
      expect(mockBalanceService.getTransactionHistory).toHaveBeenCalledWith(
        SELLER_ID,
        ORG_ID,
        expect.objectContaining({ type: "credit" }),
      );
    });

    it("applies date range filters", async () => {
      mockBalanceService.getTransactionHistory.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      await GET(
        createRequest({
          startDate: "2025-01-01",
          endDate: "2025-12-31",
        }),
      );
      expect(mockBalanceService.getTransactionHistory).toHaveBeenCalledWith(
        SELLER_ID,
        ORG_ID,
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
      );
    });

    it("respects pagination parameters", async () => {
      mockBalanceService.getTransactionHistory.mockResolvedValue({
        transactions: [],
        total: 100,
      });

      const res = await GET(createRequest({ page: "2", limit: "25" }));
      const body = await res.json();

      expect(mockBalanceService.getTransactionHistory).toHaveBeenCalledWith(
        SELLER_ID,
        ORG_ID,
        expect.objectContaining({ offset: 25, limit: 25 }),
      );
      expect(body.pagination).toEqual({
        page: 2,
        limit: 25,
        total: 100,
        pages: 4,
      });
    });

    it("caps limit at 100", async () => {
      mockBalanceService.getTransactionHistory.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      await GET(createRequest({ limit: "500" }));
      expect(mockBalanceService.getTransactionHistory).toHaveBeenCalledWith(
        SELLER_ID,
        ORG_ID,
        expect.objectContaining({ limit: 100 }),
      );
    });
  });

  describe("Error Handling", () => {
    it("returns 500 on service error", async () => {
      currentSession = {
        user: { id: SELLER_ID, orgId: ORG_ID, role: "VENDOR" },
      };
      mockBalanceService.getTransactionHistory.mockRejectedValue(
        new Error("DB error"),
      );

      const res = await GET(createRequest());
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Failed to fetch transactions");
    });
  });
});
