import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const mockCreateCampaign = vi.fn();
const mockListCampaigns = vi.fn();

vi.mock("@/services/souq/ads/campaign-service", () => ({
  CampaignService: {
    createCampaign: (...args: unknown[]) => mockCreateCampaign(...args),
    listCampaigns: (...args: unknown[]) => mockListCampaigns(...args),
  },
}));

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

// Import routes after mocks
import { POST as campaignsPOST, GET as campaignsGET } from "@/app/api/souq/ads/campaigns/route";

const makeRequest = (url: string, method: string, body?: Record<string, unknown>): NextRequest =>
  new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;

describe("Ads campaigns RBAC (STRICT v4.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCampaign.mockResolvedValue({ campaignId: "camp_1" });
    mockListCampaigns.mockResolvedValue([]);
  });

  it("POST /campaigns forbids non-allowed roles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", orgId: "org1", role: "tenant" } });

    const req = makeRequest("https://example.com/api/souq/ads/campaigns", "POST", {
      name: "Test",
      type: "sponsored_products",
      dailyBudget: 10,
      startDate: new Date().toISOString(),
      biddingStrategy: "manual",
      targeting: { type: "automatic" },
      products: ["p1"],
    });

    const res = await campaignsPOST(req);
    expect(res.status).toBe(403);
    expect(mockCreateCampaign).not.toHaveBeenCalled();
  });

  it("POST /campaigns allows vendor role", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", orgId: "org1", role: "VENDOR" } });

    const req = makeRequest("https://example.com/api/souq/ads/campaigns", "POST", {
      name: "Test",
      type: "sponsored_products",
      dailyBudget: 10,
      startDate: new Date().toISOString(),
      biddingStrategy: "manual",
      targeting: { type: "automatic" },
      products: ["p1"],
    });

    const res = await campaignsPOST(req);
    expect(res.status).toBe(200);
    expect(mockCreateCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org1", sellerId: "u1" }),
    );
  });

  it("GET /campaigns forbids non-allowed roles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", orgId: "org1", role: "tenant" } });

    const req = makeRequest("https://example.com/api/souq/ads/campaigns", "GET");
    const res = await campaignsGET(req);
    expect(res.status).toBe(403);
    expect(mockListCampaigns).not.toHaveBeenCalled();
  });

  it("GET /campaigns allows vendor role", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", orgId: "org1", role: "VENDOR" } });

    const req = makeRequest("https://example.com/api/souq/ads/campaigns", "GET");
    const res = await campaignsGET(req);
    expect(res.status).toBe(200);
    expect(mockListCampaigns).toHaveBeenCalledWith("u1", "org1", { status: undefined, type: undefined });
  });
});
