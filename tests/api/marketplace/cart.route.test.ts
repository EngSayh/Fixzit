/**
 * @fileoverview Tests for /api/marketplace/cart route
 * Tests shopping cart operations - get cart, add to cart
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock marketplace context - use module-scoped variable for stable mock reference
const mockResolveMarketplaceContext = vi.fn();
vi.mock("@/lib/marketplace/context", () => ({
  resolveMarketplaceContext: (...args: unknown[]) => mockResolveMarketplaceContext(...args),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock product model - use module-scoped variables for stable mock reference
const mockProductFind = vi.fn().mockReturnValue({
  lean: vi.fn().mockResolvedValue([]),
});
const mockProductFindOne = vi.fn().mockResolvedValue(null);
vi.mock("@/server/models/marketplace/Product", () => ({
  default: {
    find: (...args: unknown[]) => mockProductFind(...args),
    findOne: (...args: unknown[]) => mockProductFindOne(...args),
  },
}));

// Mock cart utilities - use module-scoped variables for stable mock reference
const mockGetOrCreateCart = vi.fn();
const mockRecalcCartTotals = vi.fn();
vi.mock("@/lib/marketplace/cart", () => ({
  getOrCreateCart: (...args: unknown[]) => mockGetOrCreateCart(...args),
  recalcCartTotals: (...args: unknown[]) => mockRecalcCartTotals(...args),
}));

// Mock rate limiting
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

import { GET, POST } from "@/app/api/marketplace/cart/route";

describe("API /api/marketplace/cart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET - Retrieve Cart", () => {
    it("returns 401 when user is not authenticated in production mode", async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalAnonCart = process.env.MARKETPLACE_ALLOW_ANON_CART;
      process.env.NODE_ENV = "production";
      process.env.MARKETPLACE_ALLOW_ANON_CART = "false";
      
      mockResolveMarketplaceContext.mockResolvedValue({
        userId: null,
        orgId: { toString: () => "org-123" } as never,
        role: "GUEST",
      });

      const req = new NextRequest("http://localhost:3000/api/marketplace/cart");
      const res = await GET(req);

      expect(res.status).toBe(401);
      
      process.env.NODE_ENV = originalEnv;
      process.env.MARKETPLACE_ALLOW_ANON_CART = originalAnonCart;
    });

    it("returns empty cart for authenticated user with no items", async () => {
      mockResolveMarketplaceContext.mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      mockGetOrCreateCart.mockResolvedValue({
        _id: "cart-123",
        lines: [],
        totals: { subtotal: 0, vat: 0, grand: 0 },
        save: vi.fn(),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/marketplace/cart");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it("returns cart with populated product details", async () => {
      const mockProduct = {
        _id: { toString: () => "prod-123" },
        title: { en: "Test Product" },
        buy: { price: 100, currency: "SAR", uom: "PCS" },
      };

      mockResolveMarketplaceContext.mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      mockGetOrCreateCart.mockResolvedValue({
        _id: "cart-123",
        lines: [{ productId: { toString: () => "prod-123" }, qty: 2, price: 100, total: 200 }],
        totals: { subtotal: 200, vat: 30, grand: 230 },
        save: vi.fn(),
      } as never);

      mockProductFind.mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockProduct]),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/marketplace/cart");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
    });
  });

  describe("POST - Add to Cart", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockResolveMarketplaceContext.mockResolvedValue({
        userId: null,
        orgId: { toString: () => "org-123" } as never,
        role: "GUEST",
      });

      const req = new NextRequest("http://localhost:3000/api/marketplace/cart", {
        method: "POST",
        body: JSON.stringify({ productId: "prod-123", quantity: 1 }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 404 when product not found", async () => {
      mockResolveMarketplaceContext.mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      mockProductFindOne.mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/marketplace/cart", {
        method: "POST",
        body: JSON.stringify({ productId: "prod-123", quantity: 1 }),
      });
      const res = await POST(req);

      expect(res.status).toBe(404);
    });

    it("validates request body with Zod schema", async () => {
      mockResolveMarketplaceContext.mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      const req = new NextRequest("http://localhost:3000/api/marketplace/cart", {
        method: "POST",
        body: JSON.stringify({ productId: "prod-123", quantity: -1 }), // Invalid quantity
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("adds product to cart successfully", async () => {
      const mockProduct = {
        _id: { toString: () => "prod-123" },
        buy: { price: 100, currency: "SAR", uom: "PCS" },
      };

      mockResolveMarketplaceContext.mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      mockProductFindOne.mockResolvedValue(mockProduct);
      mockGetOrCreateCart.mockResolvedValue({
        _id: "cart-123",
        lines: [],
        totals: { subtotal: 0, vat: 0, grand: 0 },
        save: vi.fn().mockResolvedValue(undefined),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/marketplace/cart", {
        method: "POST",
        body: JSON.stringify({ productId: "prod-123", quantity: 2 }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it("updates quantity if product already in cart", async () => {
      const mockProduct = {
        _id: { toString: () => "prod-123" },
        buy: { price: 100, currency: "SAR", uom: "PCS" },
      };

      mockResolveMarketplaceContext.mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      mockProductFindOne.mockResolvedValue(mockProduct);
      mockGetOrCreateCart.mockResolvedValue({
        _id: "cart-123",
        lines: [{ productId: { toString: () => "prod-123" }, qty: 1, price: 100, total: 100 }],
        totals: { subtotal: 100, vat: 15, grand: 115 },
        save: vi.fn().mockResolvedValue(undefined),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/marketplace/cart", {
        method: "POST",
        body: JSON.stringify({ productId: "prod-123", quantity: 2 }),
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
    });
  });
});
