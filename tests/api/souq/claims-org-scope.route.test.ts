import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { COLLECTIONS } from "@/lib/db/collections";

const mockGetClaim = vi.fn();
const mockFileAppeal = vi.fn();

vi.mock("@/services/souq/claims/claim-service", () => ({
  ClaimService: {
    getClaim: (...args: unknown[]) => mockGetClaim(...args),
    fileAppeal: (...args: unknown[]) => mockFileAppeal(...args),
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
    const req = makeRequest(
      "https://example.com/api/souq/claims/456/response",
      "POST",
      { action: "accept", message: "Will refund" },
    );

    const res = await responsePOST(req, { params: { id: "456" } });
    expect(res.status).toBe(200);
    const filter = updateOneMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(filter).toBeDefined();
    expect(filter).toMatchObject({
      claimId: "456",
      $or: expect.arrayContaining([
        expect.objectContaining({
          orgId: expect.objectContaining({
            $in: expect.arrayContaining(["org-1"]),
          }),
        }),
      ]),
    });
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
    claimsCollection.updateOne = vi.fn().mockResolvedValue(undefined);

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
  });
});
