/**
 * @fileoverview Tests for GET/POST /api/souq/ads/campaigns
 * @description Ad campaigns CRUD for marketplace sellers
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";

// ----- Mock Setup -----
const ORG_ID = new ObjectId().toHexString();
const USER_ID = new ObjectId().toHexString();

let mockSession: { user: { id: string; orgId: string; role: string; roles?: string[] } } | null = null;
let mockCampaigns: Record<string, unknown>[] = [];
let mockCreatedCampaign: Record<string, unknown> | null = null;

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

vi.mock("@/services/souq/ads/campaign-service", () => ({
  CampaignService: {
    createCampaign: vi.fn(async (data: Record<string, unknown>) => ({
      _id: new ObjectId(),
      ...data,
      status: "active",
      createdAt: new Date(),
    })),
    listCampaigns: vi.fn(async () => mockCampaigns),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// ----- Import Route After Mocks -----
import { POST, GET } from "@/app/api/souq/ads/campaigns/route";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

// ----- Helpers -----
function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/souq/ads/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/souq/ads/campaigns");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), { method: "GET" });
}

const validCampaignBody = {
  name: "Summer Sale Campaign",
  type: "sponsored_products",
  dailyBudget: 100,
  startDate: new Date().toISOString(),
  biddingStrategy: "auto",
  targeting: { keywords: ["summer", "sale"] },
  products: ["prod-1", "prod-2"],
};

// ----- Tests -----
describe("POST /api/souq/ads/campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    mockSession = { user: { id: USER_ID, orgId: ORG_ID, role: "VENDOR" } };
  });

  afterEach(() => {
    mockSession = null;
  });

  describe("Authentication", () => {
    it("returns 401 when not authenticated", async () => {
      mockSession = null;
      const res = await POST(createPostRequest(validCampaignBody));
      expect(res.status).toBe(401);
    });

    it("returns 403 when role not allowed for ads", async () => {
      mockSession = { user: { id: USER_ID, orgId: ORG_ID, role: "TENANT" } };
      const res = await POST(createPostRequest(validCampaignBody));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("role not allowed");
    });

    it("returns 400 when orgId missing", async () => {
      mockSession = { user: { id: USER_ID, orgId: "", role: "VENDOR" } };
      const res = await POST(createPostRequest(validCampaignBody));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("orgId");
    });
  });

  describe("Validation", () => {
    it("returns 400 when name missing", async () => {
      const { name, ...body } = validCampaignBody;
      const res = await POST(createPostRequest(body));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("name");
    });

    it("returns 400 when dailyBudget missing", async () => {
      const { dailyBudget, ...body } = validCampaignBody;
      const res = await POST(createPostRequest(body));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("dailyBudget");
    });

    it("returns 400 when products missing", async () => {
      const { products, ...body } = validCampaignBody;
      const res = await POST(createPostRequest(body));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("products");
    });
  });

  describe("Successful Creation", () => {
    it("returns success with campaign data", async () => {
      const res = await POST(createPostRequest(validCampaignBody));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it("allows ADMIN role", async () => {
      mockSession = { user: { id: USER_ID, orgId: ORG_ID, role: "ADMIN" } };
      const res = await POST(createPostRequest(validCampaignBody));
      expect(res.status).toBe(200);
    });

    it("allows SUPER_ADMIN role", async () => {
      mockSession = { user: { id: USER_ID, orgId: ORG_ID, role: "SUPER_ADMIN" } };
      const res = await POST(createPostRequest(validCampaignBody));
      expect(res.status).toBe(200);
    });
  });
});

describe("GET /api/souq/ads/campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = { user: { id: USER_ID, orgId: ORG_ID, role: "VENDOR" } };
    mockCampaigns = [
      { _id: new ObjectId(), name: "Campaign 1", status: "active" },
      { _id: new ObjectId(), name: "Campaign 2", status: "paused" },
    ];
  });

  afterEach(() => {
    mockSession = null;
    mockCampaigns = [];
  });

  describe("Authentication", () => {
    it("returns 401 when not authenticated", async () => {
      mockSession = null;
      const res = await GET(createGetRequest());
      expect(res.status).toBe(401);
    });

    it("returns 403 when role not allowed", async () => {
      mockSession = { user: { id: USER_ID, orgId: ORG_ID, role: "TENANT" } };
      const res = await GET(createGetRequest());
      expect(res.status).toBe(403);
    });

    it("returns 400 when orgId missing", async () => {
      mockSession = { user: { id: USER_ID, orgId: "", role: "VENDOR" } };
      const res = await GET(createGetRequest());
      expect(res.status).toBe(400);
    });
  });

  describe("Query Parameters", () => {
    it("accepts status filter", async () => {
      const res = await GET(createGetRequest({ status: "active" }));
      expect(res.status).toBe(200);
    });

    it("accepts type filter", async () => {
      const res = await GET(createGetRequest({ type: "sponsored_products" }));
      expect(res.status).toBe(200);
    });
  });

  describe("Response Format", () => {
    it("returns campaigns array", async () => {
      const res = await GET(createGetRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });
  });
});
