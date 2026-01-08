/**
 * @fileoverview Tests for Wallet Top-Up Route
 * @route POST /api/wallet/top-up
 * @sprint Sprint 71
 * @agent [AGENT-001-A]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Hoisted mocks
const mockAuth = vi.fn();
const mockFindOrCreate = vi.fn();
const mockFindOne = vi.fn();
const mockCreate = vi.fn();

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
    findOrCreate: () => mockFindOrCreate(),
  },
}));

vi.mock("@/server/models/souq/WalletTransaction", () => ({
  WalletTransaction: {
    create: (data: unknown) => mockCreate(data),
  },
}));

vi.mock("@/server/models/souq/SavedPaymentMethod", () => ({
  SavedPaymentMethod: {
    findOne: () => ({
      lean: () => mockFindOne(),
    }),
  },
}));

import { POST } from "@/app/api/wallet/top-up/route";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("Wallet Top-Up Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
  });

  describe("POST /api/wallet/top-up", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/wallet/top-up", {
        method: "POST",
        body: JSON.stringify({ amount: 100, payment_method: "mada" }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 401 when user has no tenantId", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
        expires: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost/api/wallet/top-up", {
        method: "POST",
        body: JSON.stringify({ amount: 100, payment_method: "mada" }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limited", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Rate limited" }, { status: 429 })
      );

      const req = new NextRequest("http://localhost/api/wallet/top-up", {
        method: "POST",
        body: JSON.stringify({ amount: 100, payment_method: "mada" }),
      });
      const res = await POST(req);

      expect(res.status).toBe(429);
    });

    it("returns 400 for invalid JSON body", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", tenantId: "org-123" },
        expires: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost/api/wallet/top-up", {
        method: "POST",
        body: "invalid json",
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("returns 400 for amount below minimum", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", tenantId: "org-123" },
        expires: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost/api/wallet/top-up", {
        method: "POST",
        body: JSON.stringify({ amount: 5, payment_method: "mada" }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("returns 400 for amount above maximum", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", tenantId: "org-123" },
        expires: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost/api/wallet/top-up", {
        method: "POST",
        body: JSON.stringify({ amount: 60000, payment_method: "mada" }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid payment method", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", tenantId: "org-123" },
        expires: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost/api/wallet/top-up", {
        method: "POST",
        body: JSON.stringify({ amount: 100, payment_method: "invalid" }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("returns 400 when saved card not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", tenantId: "org-123" },
        expires: new Date().toISOString(),
      });
      mockFindOrCreate.mockResolvedValue({ _id: "wallet-123", balance: 10000 });
      mockFindOne.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/wallet/top-up", {
        method: "POST",
        body: JSON.stringify({
          amount: 100,
          payment_method: "saved_card",
          saved_card_id: "card-invalid",
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("creates top-up transaction successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", tenantId: "org-123" },
        expires: new Date().toISOString(),
      });
      mockFindOrCreate.mockResolvedValue({ _id: "wallet-123", balance: 10000 });
      mockCreate.mockResolvedValue({
        _id: "tx-123",
        reference: "TOP-123456-abc",
        status: "pending",
      });

      const req = new NextRequest("http://localhost/api/wallet/top-up", {
        method: "POST",
        body: JSON.stringify({ amount: 100, payment_method: "mada" }),
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.transaction_id).toBeDefined();
      expect(body.checkout_url).toBeDefined();
      expect(body.status).toBe("pending");
    });

    it("includes return_url in checkout URL when provided", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", tenantId: "org-123" },
        expires: new Date().toISOString(),
      });
      mockFindOrCreate.mockResolvedValue({ _id: "wallet-123", balance: 10000 });
      mockCreate.mockResolvedValue({
        _id: "tx-123",
        reference: "TOP-123456-abc",
        status: "pending",
      });

      const req = new NextRequest("http://localhost/api/wallet/top-up", {
        method: "POST",
        body: JSON.stringify({
          amount: 100,
          payment_method: "visa",
          return_url: "https://example.com/callback",
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.checkout_url).toContain("return_url");
    });
  });
});
