/**
 * @fileoverview Tests for /api/marketplace/rfq route
 * Tests RFQ (Request for Quotation) operations - list and create
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock marketplace context
const mockResolveMarketplaceContext = vi.fn();
vi.mock("@/lib/marketplace/context", () => ({
  resolveMarketplaceContext: (...args: unknown[]) => mockResolveMarketplaceContext(...args),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock RFQ model
const mockRFQFind = vi.fn();
const mockRFQCreate = vi.fn();
vi.mock("@/server/models/marketplace/RFQ", () => ({
  default: {
    find: (...args: unknown[]) => mockRFQFind(...args),
    create: (...args: unknown[]) => mockRFQCreate(...args),
  },
}));

// Mock rate limiting
const mockSmartRateLimit = vi.fn().mockResolvedValue({ allowed: true });
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: (...args: unknown[]) => mockSmartRateLimit(...args),
}));

// Mock serializers
vi.mock("@/lib/marketplace/serializers", () => ({
  serializeRFQ: vi.fn((rfq) => rfq),
}));

import { GET, POST } from "@/app/api/marketplace/rfq/route";

describe("API /api/marketplace/rfq", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSmartRateLimit.mockResolvedValue({ allowed: true });
    mockResolveMarketplaceContext.mockResolvedValue({
      userId: "user-123",
      orgId: { toString: () => "org-123" },
      role: "BUYER",
    });
    const lean = vi.fn().mockResolvedValue([]);
    const limit = vi.fn().mockReturnValue({ lean });
    const sort = vi.fn().mockReturnValue({ limit, lean });
    mockRFQFind.mockReturnValue({ sort, limit, lean });
  });

  describe("GET - List RFQs", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockResolveMarketplaceContext.mockResolvedValue({
        userId: null,
        orgId: { toString: () => "org-123" },
        role: "GUEST",
      });

      const req = new NextRequest("http://localhost:3000/api/marketplace/rfq");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limit exceeded", async () => {
      mockSmartRateLimit.mockResolvedValue({ allowed: false });

      const req = new NextRequest("http://localhost:3000/api/marketplace/rfq");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("returns RFQ list for authenticated user", async () => {
      const req = new NextRequest("http://localhost:3000/api/marketplace/rfq");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
    });
  });

  describe("POST - Create RFQ", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockResolveMarketplaceContext.mockResolvedValue({
        userId: null,
        orgId: { toString: () => "org-123" },
        role: "GUEST",
      });

      const req = new NextRequest("http://localhost:3000/api/marketplace/rfq", {
        method: "POST",
        body: JSON.stringify({ title: "Test RFQ" }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limit exceeded", async () => {
      mockSmartRateLimit.mockResolvedValue({ allowed: false });

      const req = new NextRequest("http://localhost:3000/api/marketplace/rfq", {
        method: "POST",
        body: JSON.stringify({ title: "Test RFQ" }),
      });
      const res = await POST(req);

      expect(res.status).toBe(429);
    });

    it("validates title is required and not empty", async () => {
      const req = new NextRequest("http://localhost:3000/api/marketplace/rfq", {
        method: "POST",
        body: JSON.stringify({ title: "" }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("validates title max length (200 chars)", async () => {
      const req = new NextRequest("http://localhost:3000/api/marketplace/rfq", {
        method: "POST",
        body: JSON.stringify({ title: "x".repeat(201) }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("validates budget must be positive", async () => {
      const req = new NextRequest("http://localhost:3000/api/marketplace/rfq", {
        method: "POST",
        body: JSON.stringify({
          title: "Test RFQ",
          budget: -100,
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("creates RFQ successfully with valid data", async () => {
      mockRFQCreate.mockResolvedValue({
        _id: "rfq-new",
        title: "Request for office supplies",
        status: "OPEN",
      });

      const req = new NextRequest("http://localhost:3000/api/marketplace/rfq", {
        method: "POST",
        body: JSON.stringify({
          title: "Request for office supplies",
          description: "Need 100 packs of printer paper",
          quantity: 100,
          budget: 500,
          currency: "SAR",
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
    });
  });
});
