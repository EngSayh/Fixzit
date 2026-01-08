/**
 * @fileoverview Tests for Wallet Transactions Route
 * @route GET /api/wallet/transactions
 * @sprint Sprint 71
 * @agent [AGENT-001-A]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

// Hoisted mocks
const mockAuth = vi.fn();
const mockFindOne = vi.fn();
const mockFind = vi.fn();
const mockCountDocuments = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

vi.mock("@/lib/db/mongoose", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/souq/Wallet", () => ({
  Wallet: {
    findOne: () => ({
      lean: () => mockFindOne(),
    }),
  },
}));

vi.mock("@/server/models/souq/WalletTransaction", () => ({
  WalletTransaction: {
    find: vi.fn(() => ({
      sort: vi.fn(() => ({
        skip: vi.fn(() => ({
          limit: vi.fn(() => ({
            lean: () => mockFind(),
          })),
        })),
      })),
    })),
    countDocuments: vi.fn(() => mockCountDocuments()),
  },
}));

import { GET } from "@/app/api/wallet/transactions/route";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

const validTenantId = new Types.ObjectId().toString();
const testWallet = {
  _id: new Types.ObjectId(),
  org_id: validTenantId,
  user_id: "user-123",
  balance: 50000,
};

const testTransactions = [
  {
    _id: new Types.ObjectId(),
    type: "top_up",
    amount: 10000,
    balance_before: 40000,
    balance_after: 50000,
    status: "completed",
    reference: "TOP-123",
    description: "Top up 100 SAR",
    description_ar: "شحن 100 ر.س",
    gateway: "mada",
    created_at: new Date(),
  },
  {
    _id: new Types.ObjectId(),
    type: "ad_fee",
    amount: -500,
    balance_before: 50000,
    balance_after: 49500,
    status: "completed",
    reference: "AD-456",
    description: "Ad fee",
    created_at: new Date(),
  },
];

describe("Wallet Transactions Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
  });

  describe("GET /api/wallet/transactions", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/wallet/transactions");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 401 when user has no tenantId", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
        expires: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost/api/wallet/transactions");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limited", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Rate limited" }, { status: 429 })
      );

      const req = new NextRequest("http://localhost/api/wallet/transactions");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("returns 404 when wallet not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", tenantId: validTenantId },
        expires: new Date().toISOString(),
      });
      mockFindOne.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/wallet/transactions");
      const res = await GET(req);

      expect(res.status).toBe(404);
    });

    it("returns transactions list on success", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", tenantId: validTenantId },
        expires: new Date().toISOString(),
      });
      mockFindOne.mockResolvedValue(testWallet);
      mockFind.mockResolvedValue(testTransactions);
      mockCountDocuments.mockResolvedValue(2);

      const req = new NextRequest("http://localhost/api/wallet/transactions");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.transactions).toBeDefined();
      expect(Array.isArray(body.transactions)).toBe(true);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.total).toBe(2);
    });

    it("supports pagination query params", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", tenantId: validTenantId },
        expires: new Date().toISOString(),
      });
      mockFindOne.mockResolvedValue(testWallet);
      mockFind.mockResolvedValue([testTransactions[0]]);
      mockCountDocuments.mockResolvedValue(10);

      const req = new NextRequest("http://localhost/api/wallet/transactions?page=2&limit=5");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination.page).toBe(2);
      expect(body.pagination.limit).toBe(5);
    });

    it("supports type filter", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", tenantId: validTenantId },
        expires: new Date().toISOString(),
      });
      mockFindOne.mockResolvedValue(testWallet);
      mockFind.mockResolvedValue([testTransactions[0]]);
      mockCountDocuments.mockResolvedValue(1);

      const req = new NextRequest("http://localhost/api/wallet/transactions?type=top_up");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("supports status filter", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", tenantId: validTenantId },
        expires: new Date().toISOString(),
      });
      mockFindOne.mockResolvedValue(testWallet);
      mockFind.mockResolvedValue(testTransactions);
      mockCountDocuments.mockResolvedValue(2);

      const req = new NextRequest("http://localhost/api/wallet/transactions?status=completed");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("supports date range filter", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", tenantId: validTenantId },
        expires: new Date().toISOString(),
      });
      mockFindOne.mockResolvedValue(testWallet);
      mockFind.mockResolvedValue(testTransactions);
      mockCountDocuments.mockResolvedValue(2);

      const req = new NextRequest(
        "http://localhost/api/wallet/transactions?from=2025-01-01&to=2025-12-31"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });
  });
});
