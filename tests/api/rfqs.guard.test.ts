import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/server/security/rateLimitKey", () => ({
  buildOrgAwareRateLimitKey: vi.fn(() => "org-scope-key"),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: () => NextResponse.json({ error: "rate limited" }, { status: 429 }),
  handleApiError: (error: unknown) => {
    throw error;
  },
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: (body: unknown, status = 200) =>
    NextResponse.json(body, { status }),
}));

class UnauthorizedErrorMock extends Error {}
const getSessionUser = vi.fn();

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser,
  UnauthorizedError: UnauthorizedErrorMock,
}));

const rfqModelMock = {
  findOneAndUpdate: vi.fn(),
  findOne: vi.fn().mockReturnThis(),
  updateOne: vi.fn(),
  lean: vi.fn(),
  create: vi.fn(),
  find: vi.fn(),
  countDocuments: vi.fn(),
};

vi.mock("@/server/models/RFQ", () => ({
  RFQ: rfqModelMock,
}));

const projectBidModelMock = {
  countDocuments: vi.fn(),
  findOne: vi.fn().mockReturnThis(),
  lean: vi.fn().mockReturnThis(),
  exec: vi.fn(),
  create: vi.fn(),
};

vi.mock("@/server/models/ProjectBid", () => ({
  ProjectBidModel: projectBidModelMock,
}));

describe("RFQ publish route RBAC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when orgId is missing", async () => {
    getSessionUser.mockResolvedValue({ id: "user-1" });
    const { POST } = await import("@/app/api/rfqs/[id]/publish/route");
    const req = new NextRequest("http://localhost/api/rfqs/1/publish", { method: "POST" });
    const res = await POST(req, { params: { id: "507f191e810c19729de860ea" } });
    expect(res.status).toBe(401);
  });

  it("returns 403 for insufficient role", async () => {
    getSessionUser.mockResolvedValue({ id: "user-1", orgId: "org-1", role: "viewer" });
    const { POST } = await import("@/app/api/rfqs/[id]/publish/route");
    const req = new NextRequest("http://localhost/api/rfqs/1/publish", { method: "POST" });
    const res = await POST(req, { params: { id: "507f191e810c19729de860ea" } });
    expect(res.status).toBe(403);
  });

  it("publishes when role allowed and RFQ found", async () => {
    getSessionUser.mockResolvedValue({ id: "user-1", orgId: "org-1", role: "ADMIN" });
    const now = new Date();
    rfqModelMock.findOneAndUpdate.mockResolvedValue({
      _id: "507f191e810c19729de860eb",
      code: "RFQ-123",
      status: "PUBLISHED",
      workflow: { publishedAt: now },
    });
    const { POST } = await import("@/app/api/rfqs/[id]/publish/route");
    const req = new NextRequest("http://localhost/api/rfqs/1/publish", { method: "POST" });
    const res = await POST(req, { params: { id: "507f191e810c19729de860ea" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.rfq.status).toBe("PUBLISHED");
  });
});

describe("RFQ create/list route guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const buildPostRequest = (body: unknown) =>
    new NextRequest(
      new Request("http://localhost/api/rfqs", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      }),
    );

  it("POST returns 401 when orgId is missing", async () => {
    getSessionUser.mockResolvedValue({ id: "user-1" });
    const { POST } = await import("@/app/api/rfqs/route");
    const req = buildPostRequest({
      title: "Test RFQ",
      description: "Desc",
      category: "Cat",
      location: { city: "Riyadh" },
      timeline: { bidDeadline: "2025-01-01", startDate: "2025-01-02", completionDate: "2025-02-01" },
      budget: { estimated: 1000, currency: "SAR" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("POST creates RFQ for valid org/user", async () => {
    getSessionUser.mockResolvedValue({ id: "user-1", orgId: "org-1" });
    rfqModelMock.create.mockResolvedValue({
      _id: "rfq-1",
      orgId: "org-1",
      title: "Test RFQ",
      status: "DRAFT",
    });
    const { POST } = await import("@/app/api/rfqs/route");
    const req = buildPostRequest({
      title: "Test RFQ",
      description: "Desc",
      category: "Cat",
      location: { city: "Riyadh" },
      timeline: { bidDeadline: "2025-01-01", startDate: "2025-01-02", completionDate: "2025-02-01" },
      budget: { estimated: 1000, currency: "SAR" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.orgId).toBe("org-1");
    expect(rfqModelMock.create).toHaveBeenCalled();
  });

  it("GET lists RFQs scoped by orgId", async () => {
    getSessionUser.mockResolvedValue({ id: "user-1", orgId: "org-1" });
    const items = [{ _id: "rfq-1", orgId: "org-1" }];
    rfqModelMock.find.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => items,
        }),
      }),
    });
    rfqModelMock.countDocuments.mockResolvedValue(1);
    const { GET } = await import("@/app/api/rfqs/route");
    const req = new NextRequest("http://localhost/api/rfqs?page=1&limit=10", { method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(rfqModelMock.find).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: expect.objectContaining({ $in: expect.arrayContaining(["org-1"]) }) }),
    );
    expect(rfqModelMock.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: expect.objectContaining({ $in: expect.arrayContaining(["org-1"]) }) }),
    );
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
  });
});

describe("RFQ bids route RBAC and identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const buildRequest = (body: unknown) =>
    new NextRequest(
      new Request("http://localhost/api/rfqs/1/bids", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      }),
    );

  it("returns 401 when orgId is missing", async () => {
    getSessionUser.mockResolvedValue({ id: "vendor-1" });
    const { POST } = await import("@/app/api/rfqs/[id]/bids/route");
    const req = buildRequest({ amount: 1000, currency: "SAR", validity: "30", deliveryTime: 7, paymentTerms: "NET30" });
    const res = await POST(req, { params: { id: "507f191e810c19729de860ea" } });
    expect(res.status).toBe(401);
  });

  it("returns 403 for disallowed role", async () => {
    getSessionUser.mockResolvedValue({ id: "vendor-1", orgId: "org-1", role: "ADMIN" });
    const { POST } = await import("@/app/api/rfqs/[id]/bids/route");
    const req = buildRequest({ amount: 1000, currency: "SAR", validity: "30", deliveryTime: 7, paymentTerms: "NET30" });
    const res = await POST(req, { params: { id: "507f191e810c19729de860ea" } });
    expect(res.status).toBe(403);
  });

  it("submits bid with session-derived vendor identity for allowed role", async () => {
    getSessionUser.mockResolvedValue({ id: "507f191e810c19729de860ff", orgId: "org-1", role: "VENDOR", name: "Vendor A" });
    rfqModelMock.findOne.mockReturnThis();
    rfqModelMock.lean.mockResolvedValue({
      _id: new Types.ObjectId("507f191e810c19729de860ea"),
      orgId: "org-1",
      status: "PUBLISHED",
      bids: [],
      bidding: { targetBids: 2 },
      timeline: {},
    });
    projectBidModelMock.countDocuments.mockResolvedValue(0);
    projectBidModelMock.exec.mockResolvedValue(null);
    const bidId = new Types.ObjectId("507f191e810c19729de860ed");
    projectBidModelMock.create.mockResolvedValue({
      _id: bidId,
      vendorName: "Vendor A",
      submittedAt: new Date(),
    });
    rfqModelMock.updateOne.mockResolvedValue({ acknowledged: true });

    const { POST } = await import("@/app/api/rfqs/[id]/bids/route");
    const req = buildRequest({ amount: 1000, currency: "SAR", validity: "30", deliveryTime: 7, paymentTerms: "NET30" });
    const res = await POST(req, { params: { id: "507f191e810c19729de860ea" } });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.vendorId).toBe("507f191e810c19729de860ff");
    expect(body.bidId).toBe(bidId.toString());
  });
});
