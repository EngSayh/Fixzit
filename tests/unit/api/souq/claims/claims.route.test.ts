/**
 * @fileoverview Tests for POST/GET /api/souq/claims
 * @description A-to-Z guarantee claims for Souq marketplace
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// ----- Mock Setup -----
const ORG_ID = new ObjectId().toHexString();
const USER_ID = new ObjectId().toHexString();
const SELLER_ID = new ObjectId().toHexString();
const ORDER_ID = new ObjectId().toHexString();

let mockSession: { user: { id: string; orgId: string; role: string } } | null = null;
let mockOrder: Record<string, unknown> | null = null;
let mockExistingClaim: Record<string, unknown> | null = null;
let mockClaimResult: Record<string, unknown> | null = null;

const mockClaimsOrderLean = vi.fn();
const mockSouqClaimLean = vi.fn();
const mockSouqClaimCountDocuments = vi.fn();

vi.mock("@/lib/auth/request-session", () => ({
  resolveRequestSession: vi.fn(async () => mockSession),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn(async () => undefined),
}));

vi.mock("@/services/souq/claims/claim-service", () => ({
  ClaimService: {
    createClaim: vi.fn(async () => mockClaimResult),
    listClaims: vi.fn(async () => ({ claims: [], total: 0 })),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

vi.mock("@/services/souq/org-scope", () => ({
  buildOrgScopeFilter: vi.fn((orgId: string) => ({ orgId })),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/db/collections", () => ({
  COLLECTIONS: { CLAIMS_ORDERS: "claims_orders", CLAIMS: "claims" },
}));

vi.mock("@/server/models/souq/ClaimsOrder", () => ({
  ClaimsOrder: {
    findOne: vi.fn(() => ({ lean: (...args: unknown[]) => mockClaimsOrderLean(...args) })),
  },
}));

vi.mock("@/server/models/souq/Claim", () => ({
  SouqClaim: {
    findOne: vi.fn(() => ({ lean: (...args: unknown[]) => mockSouqClaimLean(...args) })),
    countDocuments: (...args: unknown[]) => mockSouqClaimCountDocuments(...args),
  },
}));

// ----- Import Route After Mocks -----
import { POST, GET } from "@/app/api/souq/claims/route";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

// ----- Helpers -----
function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/souq/claims", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/souq/claims");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), { method: "GET" });
}

// ----- Tests -----
describe("POST /api/souq/claims", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    mockSession = { user: { id: USER_ID, orgId: ORG_ID, role: "USER" } };
    mockOrder = {
      _id: new ObjectId(ORDER_ID),
      buyerId: USER_ID,
      sellerId: SELLER_ID,
      deliveredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      total: 500,
      items: [{ productId: "prod-1", name: "Test Product" }],
      orderNumber: "ORD-12345",
    };
    mockExistingClaim = null;
    mockClaimResult = {
      _id: new ObjectId(),
      claimId: "CLM-12345",
      status: "pending",
    };

    mockClaimsOrderLean.mockResolvedValue(mockOrder);
    mockSouqClaimLean.mockResolvedValue(mockExistingClaim);
    mockSouqClaimCountDocuments.mockResolvedValue(0);
  });

  afterEach(() => {
    mockSession = null;
    mockOrder = null;
    mockExistingClaim = null;
    mockClaimResult = null;
  });

  describe("Authentication", () => {
    it("returns 401 when not authenticated", async () => {
      mockSession = null;
      const res = await POST(createPostRequest({ orderId: ORDER_ID }));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 403 when no orgId in session", async () => {
      mockSession = { user: { id: USER_ID, orgId: "", role: "USER" } };
      const res = await POST(createPostRequest({ orderId: ORDER_ID }));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("Organization");
    });
  });

  describe("Validation", () => {
    it("returns 400 when orderId missing", async () => {
      const res = await POST(
        createPostRequest({
          reason: "defective",
          description: "Broken item",
          requestedAmount: 100,
          requestType: "refund",
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("orderId");
    });

    it("returns 400 when reason missing", async () => {
      const res = await POST(
        createPostRequest({
          orderId: ORDER_ID,
          description: "Broken item",
          requestedAmount: 100,
          requestType: "refund",
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("reason");
    });

    it("returns 400 when description missing", async () => {
      const res = await POST(
        createPostRequest({
          orderId: ORDER_ID,
          reason: "defective",
          requestedAmount: 100,
          requestType: "refund",
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("description");
    });

    it("returns 400 for invalid orderId format", async () => {
      const res = await POST(
        createPostRequest({
          orderId: "not-valid-objectid",
          reason: "defective",
          description: "Broken item",
          requestedAmount: 100,
          requestType: "refund",
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Invalid orderId");
    });
  });

  describe("Order Validation", () => {
    it("returns 400 when order not found", async () => {
      mockOrder = null;
      mockClaimsOrderLean.mockResolvedValueOnce(null);
      const res = await POST(
        createPostRequest({
          orderId: ORDER_ID,
          reason: "defective",
          description: "Broken item",
          requestedAmount: 100,
          requestType: "refund",
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Order not found");
    });

    it("returns 404 when buyer doesn't own order", async () => {
      mockOrder = { ...mockOrder, buyerId: new ObjectId().toHexString() };
      mockClaimsOrderLean.mockResolvedValueOnce(mockOrder);
      const res = await POST(
        createPostRequest({
          orderId: ORDER_ID,
          reason: "defective",
          description: "Broken item",
          requestedAmount: 100,
          requestType: "refund",
        }),
      );
      // Route returns 404 to prevent existence leak
      expect(res.status).toBe(404);
    });

    it("returns 400 when claim deadline exceeded", async () => {
      mockOrder = {
        ...mockOrder,
        deliveredAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
      };
      mockClaimsOrderLean.mockResolvedValueOnce(mockOrder);
      const res = await POST(
        createPostRequest({
          orderId: ORDER_ID,
          reason: "defective",
          description: "Broken item",
          requestedAmount: 100,
          requestType: "refund",
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("deadline exceeded");
    });
  });

  describe("Duplicate Prevention", () => {
    it("returns 400 when existing claim on order", async () => {
      mockExistingClaim = { _id: new ObjectId(), status: "pending" };
      mockSouqClaimLean.mockResolvedValueOnce(mockExistingClaim);
      const res = await POST(
        createPostRequest({
          orderId: ORDER_ID,
          reason: "defective",
          description: "Broken item",
          requestedAmount: 100,
          requestType: "refund",
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("existing claim");
    });
  });

  describe("Amount Validation", () => {
    it("returns 400 when requestedAmount exceeds order total", async () => {
      mockOrder = { ...mockOrder, total: 100 };
      mockClaimsOrderLean.mockResolvedValueOnce(mockOrder);
      const res = await POST(
        createPostRequest({
          orderId: ORDER_ID,
          reason: "defective",
          description: "Broken item",
          requestedAmount: 200,
          requestType: "refund",
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("exceeds order total");
    });
  });

  describe("Successful Creation", () => {
    it("returns 201 with claim data on success", async () => {
      const res = await POST(
        createPostRequest({
          orderId: ORDER_ID,
          reason: "defective",
          description: "Broken item",
          requestedAmount: 100,
          requestType: "refund",
        }),
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.claimId).toBeDefined();
      expect(body.status).toBe("pending");
    });
  });
});

describe("GET /api/souq/claims", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = { user: { id: USER_ID, orgId: ORG_ID, role: "USER" } };
  });

  afterEach(() => {
    mockSession = null;
  });

  describe("Authentication", () => {
    it("returns 401 when not authenticated", async () => {
      mockSession = null;
      const res = await GET(createGetRequest());
      expect(res.status).toBe(401);
    });

    it("returns 403 when no orgId in session", async () => {
      mockSession = { user: { id: USER_ID, orgId: "", role: "USER" } };
      const res = await GET(createGetRequest());
      expect(res.status).toBe(403);
    });
  });

  describe("Query Parameters", () => {
    it("accepts view=buyer", async () => {
      const res = await GET(createGetRequest({ view: "buyer" }));
      expect(res.status).toBe(200);
    });

    it("accepts view=seller", async () => {
      const res = await GET(createGetRequest({ view: "seller" }));
      expect(res.status).toBe(200);
    });

    it("accepts pagination params", async () => {
      const res = await GET(createGetRequest({ page: "2", limit: "10" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination.page).toBe(2);
      expect(body.pagination.limit).toBe(10);
    });

    it("clamps limit to max 100", async () => {
      const res = await GET(createGetRequest({ limit: "500" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination.limit).toBeLessThanOrEqual(100);
    });
  });

  describe("Response Format", () => {
    it("returns claims array and pagination", async () => {
      const res = await GET(createGetRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.claims).toBeDefined();
      expect(Array.isArray(body.claims)).toBe(true);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.page).toBeDefined();
      expect(body.pagination.limit).toBeDefined();
      expect(body.pagination.total).toBeDefined();
    });
  });

  describe("SUPER_ADMIN Access", () => {
    it("returns 400 when SUPER_ADMIN without orgId or targetOrgId", async () => {
      mockSession = { user: { id: USER_ID, orgId: "", role: "SUPER_ADMIN" } };
      const res = await GET(createGetRequest());
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("targetOrgId");
    });

    it("allows SUPER_ADMIN with targetOrgId", async () => {
      mockSession = { user: { id: USER_ID, orgId: "", role: "SUPER_ADMIN" } };
      const res = await GET(createGetRequest({ targetOrgId: ORG_ID }));
      expect(res.status).toBe(200);
    });
  });
});
