/**
 * Regression tests for RFQ bids route:
 * - maxBids enforcement on POST
 * - vendor anonymity on GET when bidding is anonymous
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Hoisted mocks to satisfy Vitest's hoisting behavior
const mocks = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  rfqFindOneMock: vi.fn(),
  rfqUpdateOneMock: vi.fn(),
  projectBidCountMock: vi.fn(),
  projectBidFindOneMock: vi.fn(),
  projectBidCreateMock: vi.fn(),
  projectBidFindMock: vi.fn(),
}));

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: mocks.getSessionUserMock,
  UnauthorizedError: class UnauthorizedError extends Error {},
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/server/security/rateLimitKey", () => ({
  buildOrgAwareRateLimitKey: vi.fn().mockReturnValue("key"),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: (data: unknown, status = 200) =>
    NextResponse.json(data, { status }),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  handleApiError: (error: unknown) => {
    // Surface error in tests to aid debugging
    return NextResponse.json(
      { error: (error as Error)?.message || "Internal error" },
      { status: 500 },
    );
  },
  rateLimitError: () => NextResponse.json({ error: "rate limited" }, { status: 429 }),
}));

vi.mock("@/server/models/RFQ", () => ({
  RFQ: {
    findOne: (...args: unknown[]) => mocks.rfqFindOneMock(...args),
    updateOne: (...args: unknown[]) => mocks.rfqUpdateOneMock(...args),
  },
}));

vi.mock("@/server/models/ProjectBid", () => ({
  ProjectBidModel: {
    countDocuments: (...args: unknown[]) => mocks.projectBidCountMock(...args),
    findOne: (...args: unknown[]) => mocks.projectBidFindOneMock(...args),
    create: (...args: unknown[]) => mocks.projectBidCreateMock(...args),
    find: (...args: unknown[]) => mocks.projectBidFindMock(...args),
  },
}));

// Module under test
import { POST, GET } from "@/app/api/rfqs/[id]/bids/route";
import { Types } from "mongoose";

const makeRequest = (method: "POST" | "GET", url: string, body?: unknown) =>
  new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "content-type": "application/json" } : undefined,
  });

describe("RFQ bids route", () => {
  const orgId = "org1";
  const vendorId = new Types.ObjectId().toString();
  const rfqId = new Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUserMock.mockResolvedValue({ orgId, id: vendorId });
    mocks.projectBidFindOneMock.mockResolvedValue(null);
    mocks.projectBidCreateMock.mockResolvedValue({
      _id: new Types.ObjectId(),
      vendorName: "Vendor",
      submittedAt: new Date(),
    });
    mocks.rfqUpdateOneMock.mockResolvedValue({ acknowledged: true });
  });

  it("rejects when maxBids already reached", async () => {
    mocks.rfqFindOneMock.mockResolvedValue({
      _id: rfqId,
      orgId,
      status: "PUBLISHED",
      bidding: { maxBids: 2, targetBids: 3 },
      timeline: {},
    });
    mocks.projectBidCountMock.mockResolvedValue(2); // already at max

    const req = makeRequest("POST", `https://example.test/api/rfqs/${rfqId}/bids`, {
      amount: 100,
      currency: "SAR",
      validity: "30 days",
      deliveryTime: 7,
      paymentTerms: "Net 30",
    });

    const res = await POST(req, { params: { id: rfqId.toString() } });
    const json = await res.json();
    // Debug aid for failures
    console.log("maxBids response", res.status, json);
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/max reached/i);
    expect(mocks.projectBidCreateMock).not.toHaveBeenCalled();
  });

  it("anonymizes vendor data on GET when bidding is anonymous and not awarded", async () => {
    mocks.rfqFindOneMock.mockResolvedValue({
      _id: rfqId,
      orgId,
      status: "BIDDING",
      bidding: { anonymous: true },
    });
    mocks.projectBidCountMock.mockResolvedValue(0);
    mocks.projectBidFindMock.mockReturnValue({
      sort: () => ({
        limit: () => ({
          lean: () => ({
            exec: () =>
              Promise.resolve([
                {
                  _id: new Types.ObjectId(),
                  vendorId: new Types.ObjectId(),
                  vendorName: "Real Vendor",
                  bidAmount: 150,
                  currency: "SAR",
                  validityText: "15 days",
                  deliveryTimeDays: 5,
                  paymentTermsNote: "Net 15",
                  submittedAt: new Date("2024-01-01T00:00:00Z"),
                  status: "SUBMITTED",
                },
              ]),
          }),
        }),
      }),
    });

    const req = makeRequest("GET", `https://example.test/api/rfqs/${rfqId}/bids`);
    const res = await GET(req, { params: { id: rfqId.toString() } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].vendorId).toBe("VENDOR-1");
    expect(json[0].vendorName).toBe("Anonymous Vendor 1");
    expect(json[0].amount).toBe(150);
  });
});
