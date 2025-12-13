/**
 * @fileoverview Tests for Souq Settlements Payout Request API
 * @route POST /api/souq/settlements/request-payout
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock MongoDB connection and collections
const mockDb = vi.hoisted(() => ({
  collection: vi.fn(),
}));

const mockFindOne = vi.fn();
const mockInsertOne = vi.fn();

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn(async () => ({
    connection: { db: mockDb },
  })),
}));

vi.mock("@/services/souq/settlements/balance-service", () => ({
  SellerBalanceService: {
    getBalance: vi.fn(),
    createWithdrawal: vi.fn(),
  },
}));

vi.mock("@/services/souq/settlements/payout-processor", () => ({
  PayoutProcessorService: {
    processPayoutRequest: vi.fn(),
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

  const mockSettlements = {
    findOne: mockFindOne,
  };
  const mockPayouts = {
    findOne: mockFindOne,
    insertOne: mockInsertOne,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    currentSession = null;
    mockFindOne.mockResolvedValue(null);
    mockInsertOne.mockResolvedValue({ insertedId: "new_payout" });

    mockDb.collection.mockImplementation((name: string) => {
      if (name === "souq_settlements") return mockSettlements;
      if (name === "souq_payouts") return mockPayouts;
      return { findOne: vi.fn(), insertOne: vi.fn() };
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

    it("returns 404 when non-admin tries to request payout for another seller", async () => {
      currentSession = {
        user: { id: SELLER_ID, orgId: ORG_ID, role: "VENDOR" },
      };
      const res = await POST(
        createRequest({
          statementId: STATEMENT_ID,
          bankAccount: { iban: "SA1234" },
          sellerId: OTHER_SELLER_ID,
        }),
      );
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("Seller not found");
    });

    it("allows admin to request payout for another seller", async () => {
      currentSession = {
        user: { id: ADMIN_ID, orgId: ORG_ID, role: "ADMIN" },
      };
      // Mock statement exists and is approved
      mockFindOne.mockResolvedValueOnce({
        statementId: STATEMENT_ID,
        status: "approved",
        summary: { netPayout: 1000 },
      });
      // Mock no existing payout
      mockFindOne.mockResolvedValueOnce(null);

      const res = await POST(
        createRequest({
          statementId: STATEMENT_ID,
          bankAccount: { iban: "SA1234567890123456789012" },
          sellerId: OTHER_SELLER_ID,
        }),
      );
      // Should proceed to statement lookup
      expect(mockDb.collection).toHaveBeenCalledWith("souq_settlements");
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
      mockFindOne.mockResolvedValueOnce(null);

      const res = await POST(
        createRequest({
          statementId: STATEMENT_ID,
          bankAccount: { iban: "SA1234567890123456789012" },
        }),
      );
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("Settlement statement not found");
    });

    it("returns 400 when statement is not approved", async () => {
      mockFindOne.mockResolvedValueOnce({
        statementId: STATEMENT_ID,
        status: "pending",
        summary: { netPayout: 1000 },
      });

      const res = await POST(
        createRequest({
          statementId: STATEMENT_ID,
          bankAccount: { iban: "SA1234567890123456789012" },
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("must be approved");
    });

    it("returns 409 when payout already exists for statement", async () => {
      mockFindOne
        .mockResolvedValueOnce({
          statementId: STATEMENT_ID,
          status: "approved",
          summary: { netPayout: 1000 },
        })
        .mockResolvedValueOnce({
          payoutId: PAYOUT_ID,
          status: "pending",
        });

      const res = await POST(
        createRequest({
          statementId: STATEMENT_ID,
          bankAccount: { iban: "SA1234567890123456789012" },
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
      mockFindOne.mockResolvedValueOnce(null);

      await POST(
        createRequest({
          statementId: STATEMENT_ID,
          bankAccount: { iban: "SA1234567890123456789012" },
        }),
      );

      expect(mockFindOne).toHaveBeenCalledWith(
        expect.objectContaining({
          statementId: STATEMENT_ID,
          orgId: expect.objectContaining({ $in: expect.any(Array) }),
        }),
        expect.any(Object),
      );
    });
  });
});
