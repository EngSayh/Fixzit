import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { Types } from "mongoose";
import { NextRequest } from "next/server";

import { SouqRMA } from "@/server/models/souq/RMA";

// Mock auth to control session context per test
const authMock = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({
  auth: authMock,
}));

// Import the route handler after mocks
let routeGet: typeof import("@/app/api/souq/returns/route").GET;

beforeAll(async () => {
  ({ GET: routeGet } = await import("@/app/api/souq/returns/route"));
});

afterEach(async () => {
  authMock.mockReset();
  await SouqRMA.deleteMany({});
});

describe("app/api/souq/returns/route GET", () => {
  it("rejects seller requests when orgId is missing", async () => {
    const sellerId = new Types.ObjectId().toString();
    authMock.mockResolvedValue({
      user: { id: sellerId, role: "SELLER", isSuperAdmin: false },
    });

    const req = new NextRequest(
      "http://test.local/api/souq/returns?type=seller",
      { method: "GET" },
    );

    const res = await routeGet(req);
    expect(res.status).toBe(403);
  });

  it("returns only seller RMAs within the tenant org", async () => {
    const sellerId = new Types.ObjectId().toString();
    const buyerId = new Types.ObjectId().toString();
    const orgA = new Types.ObjectId().toString();
    const orgB = new Types.ObjectId().toString();

    // RMA in orgA (should be returned)
    const rmaA = await SouqRMA.create({
      rmaId: `RMA-${Date.now()}`,
      orgId: orgA,
      orderId: new Types.ObjectId().toString(),
      orderNumber: "ORD-A",
      buyerId,
      sellerId,
      items: [
        {
          orderItemId: "OI-A",
          listingId: "L-A",
          productId: "P-A",
          productName: "Prod A",
          quantity: 1,
          unitPrice: 10,
          reason: "defective",
          returnReason: "defective",
        },
      ],
      status: "initiated",
      returnWindowDays: 30,
      returnDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      shipping: { shippingCost: 0, paidBy: "seller" },
      refund: { amount: 10, method: "original_payment", status: "pending" },
      timeline: [{ status: "initiated", timestamp: new Date(), performedBy: buyerId }],
    });

    // Noise RMA in orgB (should not be returned)
    await SouqRMA.create({
      rmaId: `RMA-${Date.now()}-B`,
      orgId: orgB,
      orderId: new Types.ObjectId().toString(),
      orderNumber: "ORD-B",
      buyerId,
      sellerId,
      items: [
        {
          orderItemId: "OI-B",
          listingId: "L-B",
          productId: "P-B",
          productName: "Prod B",
          quantity: 1,
          unitPrice: 5,
          reason: "defective",
          returnReason: "defective",
        },
      ],
      status: "initiated",
      returnWindowDays: 30,
      returnDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      shipping: { shippingCost: 0, paidBy: "seller" },
      refund: { amount: 5, method: "original_payment", status: "pending" },
      timeline: [{ status: "initiated", timestamp: new Date(), performedBy: buyerId }],
    });

    authMock.mockResolvedValue({
      user: { id: sellerId, role: "SELLER", isSuperAdmin: false, orgId: orgA },
    });

    const req = new NextRequest(
      "http://test.local/api/souq/returns?type=seller",
      { method: "GET" },
    );

    const res = await routeGet(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.returns[0]?.orderId).toBe(rmaA.orderId);
  });

  it("requires targetOrgId for platform admins listing admin returns", async () => {
    authMock.mockResolvedValue({
      user: { id: "admin", role: "SUPER_ADMIN", isSuperAdmin: true, orgId: new Types.ObjectId().toString() },
    });

    const req = new NextRequest(
      "http://test.local/api/souq/returns?type=admin",
      { method: "GET" },
    );

    const res = await routeGet(req);
    expect(res.status).toBe(400);
  });

  it("returns admin list scoped to targetOrgId for platform admins", async () => {
    const sellerId = new Types.ObjectId().toString();
    const buyerId = new Types.ObjectId().toString();
    const orgA = new Types.ObjectId().toString();
    const orgB = new Types.ObjectId().toString();

    await SouqRMA.create({
      rmaId: `RMA-${Date.now()}-A2`,
      orgId: orgA,
      orderId: new Types.ObjectId().toString(),
      orderNumber: "ORD-A2",
      buyerId,
      sellerId,
      items: [
        {
          orderItemId: "OI-A2",
          listingId: "L-A2",
          productId: "P-A2",
          productName: "Prod A2",
          quantity: 1,
          unitPrice: 20,
          reason: "defective",
          returnReason: "defective",
        },
      ],
      status: "initiated",
      returnWindowDays: 30,
      returnDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      shipping: { shippingCost: 0, paidBy: "seller" },
      refund: { amount: 20, method: "original_payment", status: "pending" },
      timeline: [{ status: "initiated", timestamp: new Date(), performedBy: buyerId }],
    });

    await SouqRMA.create({
      rmaId: `RMA-${Date.now()}-B2`,
      orgId: orgB,
      orderId: new Types.ObjectId().toString(),
      orderNumber: "ORD-B2",
      buyerId,
      sellerId,
      items: [
        {
          orderItemId: "OI-B2",
          listingId: "L-B2",
          productId: "P-B2",
          productName: "Prod B2",
          quantity: 1,
          unitPrice: 30,
          reason: "defective",
          returnReason: "defective",
        },
      ],
      status: "initiated",
      returnWindowDays: 30,
      returnDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      shipping: { shippingCost: 0, paidBy: "seller" },
      refund: { amount: 30, method: "original_payment", status: "pending" },
      timeline: [{ status: "initiated", timestamp: new Date(), performedBy: buyerId }],
    });

    authMock.mockResolvedValue({
      user: { id: "admin", role: "SUPER_ADMIN", isSuperAdmin: true, orgId: orgA },
    });

    const req = new NextRequest(
      `http://test.local/api/souq/returns?type=admin&targetOrgId=${orgA}`,
      { method: "GET" },
    );

    const res = await routeGet(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.returns[0]?.orderNumber).toBe("ORD-A2");
  });
});
