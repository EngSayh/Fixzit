/**
 * @fileoverview Tests for /api/marketplace/checkout route
 * Tests checkout operations - convert cart to order
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock marketplace context
vi.mock("@/lib/marketplace/context", () => ({
  resolveMarketplaceContext: vi.fn(),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock cart utilities
vi.mock("@/lib/marketplace/cart", () => ({
  getOrCreateCart: vi.fn(),
  recalcCartTotals: vi.fn(),
}));

// Mock rate limiting
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

// Mock serializers
vi.mock("@/lib/marketplace/serializers", () => ({
  serializeOrder: vi.fn((order) => order),
}));

import { resolveMarketplaceContext } from "@/lib/marketplace/context";
import { getOrCreateCart, recalcCartTotals } from "@/lib/marketplace/cart";
import { smartRateLimit } from "@/server/security/rateLimit";
import { POST } from "@/app/api/marketplace/checkout/route";

describe("API /api/marketplace/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST - Checkout Cart", () => {
    it("returns 401 when user is not authenticated", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: null,
        orgId: { toString: () => "org-123" } as never,
        role: "GUEST",
      });

      const req = new NextRequest("http://localhost:3000/api/marketplace/checkout", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limit exceeded", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false });

      const req = new NextRequest("http://localhost:3000/api/marketplace/checkout", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await POST(req);

      expect(res.status).toBe(429);
    });

    it("returns 400 when cart is empty", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
      vi.mocked(getOrCreateCart).mockResolvedValue({
        _id: "cart-123",
        lines: [], // Empty cart
        totals: { subtotal: 0, vat: 0, grand: 0 },
        save: vi.fn(),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/marketplace/checkout", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("creates pending order for cart below approval threshold", async () => {
      const originalThreshold = process.env.MARKETPLACE_APPROVAL_THRESHOLD;
      process.env.MARKETPLACE_APPROVAL_THRESHOLD = "5000";

      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
      vi.mocked(getOrCreateCart).mockResolvedValue({
        _id: "order-123",
        lines: [{ productId: "prod-1", qty: 2, price: 100, total: 200, currency: "SAR" }],
        totals: { subtotal: 200, vat: 30, grand: 230 },
        status: "CART",
        approvals: {},
        save: vi.fn().mockResolvedValue(undefined),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/marketplace/checkout", {
        method: "POST",
        body: JSON.stringify({
          shipTo: {
            address: "123 Main St",
            contact: "John Doe",
            phone: "+966500000000",
          },
        }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      
      process.env.MARKETPLACE_APPROVAL_THRESHOLD = originalThreshold;
    });

    it("creates order requiring approval for cart above threshold", async () => {
      const originalThreshold = process.env.MARKETPLACE_APPROVAL_THRESHOLD;
      process.env.MARKETPLACE_APPROVAL_THRESHOLD = "100";

      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
      vi.mocked(getOrCreateCart).mockResolvedValue({
        _id: "order-123",
        lines: [{ productId: "prod-1", qty: 2, price: 5000, total: 10000, currency: "SAR" }],
        totals: { subtotal: 10000, vat: 1500, grand: 11500 },
        status: "CART",
        approvals: {},
        save: vi.fn().mockResolvedValue(undefined),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/marketplace/checkout", {
        method: "POST",
        body: JSON.stringify({
          shipTo: {
            address: "123 Main St",
            contact: "John Doe",
          },
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      
      process.env.MARKETPLACE_APPROVAL_THRESHOLD = originalThreshold;
    });

    it("validates shipTo schema with Zod", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
      vi.mocked(getOrCreateCart).mockResolvedValue({
        _id: "cart-123",
        lines: [{ productId: "prod-1", qty: 1, price: 100, total: 100 }],
        totals: { subtotal: 100, vat: 15, grand: 115 },
        save: vi.fn(),
      } as never);

      // Empty address should fail validation
      const req = new NextRequest("http://localhost:3000/api/marketplace/checkout", {
        method: "POST",
        body: JSON.stringify({
          shipTo: {
            address: "", // Empty - should fail
            contact: "John",
          },
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });
});
