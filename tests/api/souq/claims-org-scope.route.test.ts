import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { COLLECTIONS } from "@/lib/db/collections";

const mockGetClaim = vi.fn();
const mockFileAppeal = vi.fn();
const mockAddSellerResponse = vi.fn();

vi.mock("@/services/souq/claims/claim-service", () => ({
  ClaimService: {
    getClaim: (...args: unknown[]) => mockGetClaim(...args),
    fileAppeal: (...args: unknown[]) => mockFileAppeal(...args),
    addSellerResponse: (...args: unknown[]) => mockAddSellerResponse(...args),
  },
}));

const mockResolveSession = vi.fn();
vi.mock("@/lib/auth/request-session", () => ({
  resolveRequestSession: (...args: unknown[]) => mockResolveSession(...args),
}));

const updateOneMock = vi.fn();
const claimsCollection = { updateOne: (...args: unknown[]) => updateOneMock(...args) };
const ordersCollection = { findOne: vi.fn() };
const usersCollection = { findOne: vi.fn() };

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: () => ({
    collection: (name: string) => {
      if (name === COLLECTIONS.CLAIMS) return claimsCollection;
      if (name === COLLECTIONS.ORDERS) return ordersCollection;
      if (name === COLLECTIONS.USERS) return usersCollection;
      return { findOne: vi.fn(), updateOne: vi.fn() };
    },
  }),
}));

// Import routes under test after mocks
import { POST as appealPOST } from "@/app/api/souq/claims/[id]/appeal/route";
import { POST as responsePOST } from "@/app/api/souq/claims/[id]/response/route";
import { POST as decisionPOST } from "@/app/api/souq/claims/[id]/decision/route";

const makeRequest = (url: string, method: string, body: Record<string, unknown>): NextRequest =>
  new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;

describe("Claims routes - org scoping enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateOneMock.mockReset();
    ordersCollection.findOne.mockReset();
    usersCollection.findOne.mockReset();
    mockResolveSession.mockReturnValue({
      user: { id: "user-1", orgId: "org-1", role: "ADMIN" },
    });
  });

  it("appeal route uses orgId when filing appeal", async () => {
    mockGetClaim.mockResolvedValue({
      claimId: "C1",
      buyerId: "user-1",
      sellerId: "seller-1",
      status: "resolved",
      decision: { decidedAt: new Date().toISOString() },
    });
    mockFileAppeal.mockResolvedValue(undefined);

    const req = makeRequest(
      "https://example.com/api/souq/claims/123/appeal",
      "POST",
      { reasoning: "Need reconsideration" },
    );

    const res = await appealPOST(req, { params: { id: "123" } });
    expect(res.status).toBe(200);
    expect(mockFileAppeal).toHaveBeenCalledWith(
      "123",
      "org-1",
      "buyer",
      "Need reconsideration",
      expect.any(Array),
      expect.objectContaining({ allowOrgless: true }),
    );
  });

  it("seller response update is scoped to org filter", async () => {
    mockGetClaim.mockResolvedValue({
      claimId: "C2",
      sellerId: "user-1",
      buyerId: "buyer-1",
      status: "pending_seller_response",
    });
    mockAddSellerResponse.mockResolvedValue(undefined);
    const req = makeRequest(
      "https://example.com/api/souq/claims/456/response",
      "POST",
      { action: "accept", message: "Will refund" },
    );

    const res = await responsePOST(req, { params: { id: "456" } });
    expect(res.status).toBe(200);
    // Verify addSellerResponse was called with orgId for tenant isolation
    expect(mockAddSellerResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        claimId: "456",
        orgId: "org-1",
        sellerId: "user-1",
      }),
    );
  });

  it("decision route enforces org scoping for order lookup and claim access", async () => {
    const orgObjectId = new ObjectId("6566c5b6e51fbe1b2f000001");
    mockResolveSession.mockReturnValue({
      user: { id: "admin-1", orgId: orgObjectId.toString(), role: "ADMIN" },
    });
    usersCollection.findOne.mockResolvedValue({ role: "ADMIN" });
    mockGetClaim.mockResolvedValue({
      claimId: "C3",
      orderId: "order-1",
      buyerId: "buyer-1",
      sellerId: "seller-1",
      status: "pending_review",
      refundAmount: 50,
    });
    ordersCollection.findOne.mockResolvedValue({
      _id: "order-1",
      orgId: orgObjectId,
      pricing: { total: 100 },
    });
    updateOneMock.mockResolvedValue(undefined);

    const req = makeRequest(
      "https://example.com/api/souq/claims/789/decision",
      "POST",
      { decision: "approve", reasoning: "Valid", refundAmount: 50 },
    );

    const res = await decisionPOST(req, { params: { id: "789" } });
    expect(res.status).toBe(200);
    expect(mockGetClaim).toHaveBeenCalledWith("789", orgObjectId.toString(), true);
    const orderFilter = ordersCollection.findOne.mock.calls[0]?.[0];
    expect(orderFilter).toMatchObject({
      orgId: expect.any(ObjectId),
    });
    const updateFilter = updateOneMock.mock.calls[0]?.[0];
    // In test mode, allowOrgless=true wraps the filter in $or pattern
    // The claim filter includes $or with orgId match + orgId.$exists:false for orgless claims
    expect(updateFilter).toHaveProperty("claimId", "789");
    expect(updateFilter).toHaveProperty("$or");
    // Verify the $or pattern includes org scoping
    const orClauses = updateFilter.$or as Array<{ orgId?: unknown }>;
    const hasOrgIdClause = orClauses.some(
      (clause) => clause.orgId && typeof clause.orgId === "object"
    );
    expect(hasOrgIdClause).toBe(true);
  });

  it("decision route blocks cross-tenant decision when order is not in org", async () => {
    const orgObjectId = new ObjectId("6566c5b6e51fbe1b2f000002");
    mockResolveSession.mockReturnValue({
      user: { id: "admin-1", orgId: orgObjectId.toString(), role: "ADMIN" },
    });
    usersCollection.findOne.mockResolvedValue({ role: "ADMIN" });
    mockGetClaim.mockResolvedValue({
      claimId: "C4",
      orderId: "order-x",
      buyerId: "buyer-2",
      sellerId: "seller-2",
      status: "pending_review",
      refundAmount: 25,
    });
    ordersCollection.findOne.mockResolvedValue(null); // No order in this org
    updateOneMock.mockResolvedValue(undefined);

    const req = makeRequest(
      "https://example.com/api/souq/claims/999/decision",
      "POST",
      { decision: "approve", reasoning: "Invalid item", refundAmount: 25 },
    );

    const res = await decisionPOST(req, { params: { id: "999" } });
    // 🔐 STRICT v4.1: Return 404 (not 403) to prevent info leakage about resources in other orgs
    expect(res.status).toBe(404);
    expect(updateOneMock).not.toHaveBeenCalled();
  });
});
