import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockSouqOrder = vi.hoisted(() => ({
  findOne: vi.fn(),
}));
const mockFulfillmentService = vi.hoisted(() => ({
  generateFBMLabel: vi.fn(),
  calculateSLA: vi.fn(),
}));

vi.mock("@/lib/auth/getServerSession", () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock("@/server/models/souq/Order", () => ({
  SouqOrder: mockSouqOrder,
}));

vi.mock("@/services/souq/fulfillment-service", () => ({
  fulfillmentService: mockFulfillmentService,
}));

let generateLabelRoute: typeof import("@/app/api/souq/fulfillment/generate-label/route");
let slaRoute: typeof import("@/app/api/souq/fulfillment/sla/[orderId]/route");

const mockOrderFindOne = (value: unknown) => {
  mockSouqOrder.findOne.mockReturnValue({
    lean: vi.fn().mockResolvedValue(value),
  });
};

describe("Souq fulfillment routes - org scoping", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue(null);
    mockOrderFindOne(null);
    generateLabelRoute = await import(
      "@/app/api/souq/fulfillment/generate-label/route"
    );
    slaRoute = await import(
      "@/app/api/souq/fulfillment/sla/[orderId]/route"
    );
  });

  describe("POST /api/souq/fulfillment/generate-label", () => {
    it("rejects when orgId is missing on session", async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: "seller-1" } });
      const req = new NextRequest("http://test.local", {
        method: "POST",
        body: JSON.stringify({ orderId: "ORD-1", carrier: "spl" }),
      } as RequestInit);

      const res = await generateLabelRoute.POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("orgId");
    });

    it("scopes order lookup by orgId", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "seller-1", orgId: "org-1", role: "ADMIN" },
      });
      mockOrderFindOne(null);
      const req = new NextRequest("http://test.local", {
        method: "POST",
        body: JSON.stringify({ orderId: "ORD-1", carrier: "spl" }),
      } as RequestInit);

      const res = await generateLabelRoute.POST(req);
      expect(mockSouqOrder.findOne).toHaveBeenCalledWith({
        orderId: "ORD-1",
        orgId: "org-1",
      });
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/souq/fulfillment/sla/[orderId]", () => {
    it("rejects when orgId is missing on session", async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: "seller-1" } });
      const req = new NextRequest("http://test.local");

      const res = await slaRoute.GET(req, { params: { orderId: "ORD-1" } });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("Organization");
    });

    it("scopes SLA lookup by orgId", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "seller-1", orgId: "org-1", role: "ADMIN" },
      });
      mockOrderFindOne({ orderId: "ORD-1", items: [] });
      mockFulfillmentService.calculateSLA.mockResolvedValue({
        currentStatus: "pending",
      });
      const req = new NextRequest("http://test.local");

      const res = await slaRoute.GET(req, { params: { orderId: "ORD-1" } });
      expect(mockSouqOrder.findOne).toHaveBeenCalledWith({
        orderId: "ORD-1",
        orgId: "org-1",
      });
      expect(mockFulfillmentService.calculateSLA).toHaveBeenCalledWith(
        "ORD-1",
        "org-1",
      );
      expect(res.status).toBe(200);
    });
  });
});
