/**
 * @fileoverview Tests for Souq Settlements Payout Request API
 * @route POST /api/souq/settlements/request-payout
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockDb = vi.hoisted(() => ({
  collection: vi.fn(),
}));

const mockWithdrawalUpdateOne = vi.fn();

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn(async () => ({
    connection: { db: mockDb },
  })),
}));

vi.mock("@/services/souq/settlements/balance-service", () => ({
  SellerBalanceService: {
    getStatementBasicInfo: vi.fn(),
    getExistingPayout: vi.fn(),
    getBalance: vi.fn(),
    requestWithdrawal: vi.fn(),
    recordTransaction: vi.fn(),
  },
}));

vi.mock("@/services/souq/settlements/payout-processor", () => ({
  PayoutProcessorService: {
    requestPayout: vi.fn(),
  },
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
const STATEMENT_ID = "stmt_123456789";
const PAYOUT_ID = "payout_123456789";

// Valid bank account structure matching route requirements
const VALID_BANK_ACCOUNT = {
  iban: "SA1234567890123456789012",
  accountHolderName: "Test Seller",
  bankName: "Test Bank",
  accountNumber: "1234567890",
};

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/souq/settlements/request-payout",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("/api/souq/settlements/request-payout", () => {
  let POST: typeof import("@/app/api/souq/settlements/request-payout/route").POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    currentSession = null;
    mockWithdrawalUpdateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    mockDb.collection.mockImplementation((name: string) => {
      if (name === "souq_withdrawal_requests") {
        return { updateOne: (...args: unknown[]) => mockWithdrawalUpdateOne(...args) };
      }
      return { updateOne: vi.fn() };
    });

    const mod = await import(
      "@/app/api/souq/settlements/request-payout/route"
    );
    POST = mod.POST;
  });

  describe("Authentication & Authorization", () => {
    it("returns 401 when session is missing", async () => {
      currentSession = null;
      const res = await POST(
        createRequest({
          statementId: STATEMENT_ID,
          bankAccount: { iban: "SA1234" },
        }),
      );
      expect(res.status).toBe(401);
    });

    it("returns 403 when orgId is missing", async () => {
      currentSession = { user: { id: SELLER_ID, role: "VENDOR" } };
      const res = await POST(
        createRequest({
          statementId: STATEMENT_ID,
          bankAccount: { iban: "SA1234" },
        }),
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Organization context required");
    });

    it("returns 403 when role cannot request payouts", async () => {
      currentSession = {
        user: { id: SELLER_ID, orgId: ORG_ID, role: "VIEWER" },
      };
      const res = await POST(
        createRequest({
          statementId: STATEMENT_ID,
          bankAccount: { iban: "SA1234" },
        }),
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("cannot request payouts");
    });

    it("returns 400 when bankAccount is incomplete for cross-seller request", async () => {
      currentSession = {
        user: { id: SELLER_ID, orgId: ORG_ID, role: "VENDOR" },
      };
      // Route validates bankAccount fields before checking seller access
      const res = await POST(
        createRequest({
          statementId: STATEMENT_ID,
          bankAccount: { iban: "SA1234" }, // Missing required fields
          sellerId: OTHER_SELLER_ID,
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("bankAccount");
    });

    it("allows admin to request payout for another seller", async () => {
      currentSession = {
        user: { id: ADMIN_ID, orgId: ORG_ID, role: "ADMIN" },
      };
      const { SellerBalanceService } = await import(
        "@/services/souq/settlements/balance-service"
      );
      const { PayoutProcessorService } = await import(
        "@/services/souq/settlements/payout-processor"
      );
      vi.mocked(SellerBalanceService.getStatementBasicInfo).mockResolvedValueOnce({
        status: "approved",
        netPayout: 1000,
      } as never);
      vi.mocked(SellerBalanceService.getExistingPayout).mockResolvedValueOnce(null as never);
      vi.mocked(SellerBalanceService.getBalance).mockResolvedValueOnce({
        available: 2000,
      } as never);
      vi.mocked(SellerBalanceService.requestWithdrawal).mockResolvedValueOnce({
        requestId: "wr-1",
        amount: 1000,
      } as never);
      vi.mocked(PayoutProcessorService.requestPayout).mockResolvedValueOnce({
        payoutId: "po-1",
        status: "pending",
      } as never);

      const res = await POST(
        createRequest({
          statementId: STATEMENT_ID,
          bankAccount: {
            iban: "SA1234567890123456789012",
            accountHolderName: "Test Holder",
            bankName: "Test Bank",
            accountNumber: "123456789",
          },
          sellerId: OTHER_SELLER_ID,
        }),
      );
      // Should return 201 or process payout - not 400/403
      expect(res.status).not.toBe(400);
      expect(res.status).not.toBe(403);
    });
  });

  describe("Validation", () => {
    beforeEach(() => {
      currentSession = {
        user: { id: SELLER_ID, orgId: ORG_ID, role: "VENDOR" },
      };
    });

    it("returns 400 when statementId is missing", async () => {
      const res = await POST(
        createRequest({
          bankAccount: { iban: "SA1234" },
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("statementId");
    });

    it("returns 400 when bankAccount is missing", async () => {
      const res = await POST(
        createRequest({
          statementId: STATEMENT_ID,
        }),
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when iban is missing", async () => {
      const res = await POST(
        createRequest({
          statementId: STATEMENT_ID,
          bankAccount: {},
        }),
      );
      expect(res.status).toBe(400);
    });
  });

  describe("Statement Validation", () => {
    beforeEach(() => {
      currentSession = {
        user: { id: SELLER_ID, orgId: ORG_ID, role: "VENDOR" },
      };
    });

    it("returns 404 when statement is not found", async () => {
      const { SellerBalanceService } = await import(
        "@/services/souq/settlements/balance-service"
      );
      vi.mocked(SellerBalanceService.getStatementBasicInfo).mockResolvedValueOnce(null as never);

      const res = await POST(
        createRequest({
          statementId: STATEMENT_ID,
          bankAccount: {
            iban: "SA1234567890123456789012",
            accountHolderName: "Test Holder",
            bankName: "Test Bank",
            accountNumber: "123456789",
          },
        }),
      );
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("Settlement statement not found");
    });

    it("returns 400 when statement is not approved", async () => {
      const { SellerBalanceService } = await import(
        "@/services/souq/settlements/balance-service"
      );
      vi.mocked(SellerBalanceService.getStatementBasicInfo).mockResolvedValueOnce({
        status: "pending",
        netPayout: 1000,
      } as never);

      const res = await POST(
        createRequest({
          statementId: STATEMENT_ID,
          bankAccount: {
            iban: "SA1234567890123456789012",
            accountHolderName: "Test Holder",
            bankName: "Test Bank",
            accountNumber: "123456789",
          },
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("must be approved");
    });

    it("returns 409 when payout already exists for statement", async () => {
      const { SellerBalanceService } = await import(
        "@/services/souq/settlements/balance-service"
      );
      vi.mocked(SellerBalanceService.getStatementBasicInfo).mockResolvedValueOnce({
        status: "approved",
        netPayout: 1000,
      } as never);
      vi.mocked(SellerBalanceService.getExistingPayout).mockResolvedValueOnce({
        payoutId: PAYOUT_ID,
        status: "pending",
      } as never);

      const res = await POST(
        createRequest({
          statementId: STATEMENT_ID,
          bankAccount: {
            iban: "SA1234567890123456789012",
            accountHolderName: "Test Holder",
            bankName: "Test Bank",
            accountNumber: "123456789",
          },
        }),
      );
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toContain("Payout already exists");
    });
  });

  describe("Tenant Isolation", () => {
    it("queries statement with orgId filter", async () => {
      currentSession = {
        user: { id: SELLER_ID, orgId: ORG_ID, role: "VENDOR" },
      };
      const { SellerBalanceService } = await import(
        "@/services/souq/settlements/balance-service"
      );
      vi.mocked(SellerBalanceService.getStatementBasicInfo).mockResolvedValueOnce(null as never);

      const res = await POST(
        createRequest({
          statementId: STATEMENT_ID,
          bankAccount: {
            iban: "SA1234567890123456789012",
            accountHolderName: "Test Holder",
            bankName: "Test Bank",
            accountNumber: "123456789",
          },
        }),
      );

      expect(SellerBalanceService.getStatementBasicInfo).toHaveBeenCalledWith(
        STATEMENT_ID,
        SELLER_ID,
        ORG_ID,
      );
      // Route should return 404 since mock returns null (statement not found)
      expect(res.status).toBe(404);
    });
  });
});
