/**
 * @fileoverview Tests for /api/marketplace/rfq route
 * Tests RFQ (Request for Quotation) operations - list and create
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

// Mock RFQ model
vi.mock("@/server/models/marketplace/RFQ", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    create: vi.fn(),
  },
}));

// Mock rate limiting
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

// Mock serializers
vi.mock("@/lib/marketplace/serializers", () => ({
  serializeRFQ: vi.fn((rfq) => rfq),
}));

import { resolveMarketplaceContext } from "@/lib/marketplace/context";
import { smartRateLimit } from "@/server/security/rateLimit";
import RFQ from "@/server/models/marketplace/RFQ";
import { GET, POST } from "@/app/api/marketplace/rfq/route";

describe("API /api/marketplace/rfq", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET - List RFQs", () => {
    it("returns 401 when user is not authenticated", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: null,
        orgId: { toString: () => "org-123" } as never,
        role: "GUEST",
      });

      const req = new NextRequest("http://localhost:3000/api/marketplace/rfq");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limit exceeded", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false });

      const req = new NextRequest("http://localhost:3000/api/marketplace/rfq");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("returns empty list when no RFQs exist", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });

      const req = new NextRequest("http://localhost:3000/api/marketplace/rfq");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data).toEqual([]);
    });

    it("returns list of RFQs for organization", async () => {
      const mockRFQs = [
        { _id: "rfq-1", title: "Request for servers", status: "OPEN" },
        { _id: "rfq-2", title: "Request for laptops", status: "CLOSED" },
      ];

      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
      vi.mocked(RFQ.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockRFQs),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/marketplace/rfq");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
    });
  });

  describe("POST - Create RFQ", () => {
    it("returns 401 when user is not authenticated", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: null,
        orgId: { toString: () => "org-123" } as never,
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
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false });

      const req = new NextRequest("http://localhost:3000/api/marketplace/rfq", {
        method: "POST",
        body: JSON.stringify({ title: "Test RFQ" }),
      });
      const res = await POST(req);

      expect(res.status).toBe(429);
    });

    it("validates title is required", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });

      const req = new NextRequest("http://localhost:3000/api/marketplace/rfq", {
        method: "POST",
        body: JSON.stringify({ title: "" }), // Empty title
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("validates title max length", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });

      const req = new NextRequest("http://localhost:3000/api/marketplace/rfq", {
        method: "POST",
        body: JSON.stringify({ title: "x".repeat(201) }), // Too long
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("creates RFQ successfully with valid data", async () => {
      const createdRFQ = {
        _id: "rfq-new",
        title: "Request for office supplies",
        status: "OPEN",
        orgId: "org-123",
      };

      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
      vi.mocked(RFQ.create).mockResolvedValue(createdRFQ as never);

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
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.ok).toBe(true);
    });

    it("validates budget must be positive", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });

      const req = new NextRequest("http://localhost:3000/api/marketplace/rfq", {
        method: "POST",
        body: JSON.stringify({
          title: "Test RFQ",
          budget: -100, // Negative budget
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });
});
