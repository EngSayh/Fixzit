import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { Types } from "mongoose";
import { nanoid } from "nanoid";

const { mockAddJob, mockProcessReturn, mockGetRates } = vi.hoisted(() => ({
  mockAddJob: vi.fn(async () => undefined),
  mockProcessReturn: vi.fn(async () => undefined),
  mockGetRates: vi.fn(async () => [{ carrier: "SPL", cost: 12 }]),
}));

vi.mock("@/lib/queues/setup", () => ({
  addJob: mockAddJob,
  QUEUE_NAMES: { NOTIFICATIONS: "notifications" },
}));

vi.mock("@/services/souq/inventory-service", () => ({
  inventoryService: {
    processReturn: mockProcessReturn,
  },
}));

vi.mock("@/services/souq/fulfillment-service", () => ({
  fulfillmentService: {
    getRates: mockGetRates,
  },
}));

import { SouqOrder } from "@/server/models/souq/Order";
import { SouqListing } from "@/server/models/souq/Listing";
import { SouqRMA } from "@/server/models/souq/RMA";

let returnsService: typeof import("@/services/souq/returns-service").returnsService;

const REQUIRED_ADDRESS = {
  name: "Test User",
  phone: "123456789",
  addressLine1: "123 Test St",
  city: "Riyadh",
  country: "SA",
  postalCode: "12345",
};

async function seedOrder({
  price = 100,
  quantity = 1,
  reason = "changed_mind" as const,
} = {}) {
  const buyerId = new Types.ObjectId();
  const sellerId = new Types.ObjectId();
  const productId = new Types.ObjectId();
  const listingId = new Types.ObjectId();

  await SouqListing.create({
    _id: listingId,
    listingId: `L-${nanoid(6)}`,
    productId,
    fsin: "FSIN-TEST",
    sellerId,
    price,
    currency: "SAR",
    stockQuantity: 10,
    reservedQuantity: 0,
    availableQuantity: 10,
    lowStockThreshold: 1,
    fulfillmentMethod: "fbm",
    handlingTime: 1,
    shippingOptions: [{ method: "standard", price: 10, estimatedDays: 3 }],
    condition: "new",
    metrics: {
      orderCount: 0,
      cancelRate: 0,
      defectRate: 0,
      onTimeShipRate: 100,
      customerRating: 5,
      priceCompetitiveness: 50,
    },
    status: "active",
  });

  const deliveredAt = new Date();

  const order = await SouqOrder.create({
    orderId: `ORD-${nanoid(6)}`,
    customerId: buyerId,
    customerEmail: "buyer@test.com",
    customerPhone: "123456789",
    items: [
      {
        listingId,
        productId,
        fsin: "FSIN-TEST",
        sellerId,
        title: "Test Product",
        quantity,
        pricePerUnit: price,
        subtotal: price * quantity,
        fulfillmentMethod: "fbm",
        status: "delivered",
        deliveredAt,
      },
    ],
    shippingAddress: REQUIRED_ADDRESS,
    pricing: {
      subtotal: price * quantity,
      shippingFee: 10,
      tax: 0,
      discount: 0,
      total: price * quantity + 10,
      currency: "SAR",
    },
    payment: {
      method: "card",
      status: "captured",
      transactionId: "txn_1",
      paidAt: deliveredAt,
    },
    status: "delivered",
    fulfillmentStatus: "delivered",
    deliveredAt,
  });

  return {
    order,
    listingId: listingId.toString(),
    buyerId: buyerId.toString(),
    sellerId: sellerId.toString(),
    reason,
    price,
    quantity,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

beforeAll(async () => {
  ({ returnsService } = await import("@/services/souq/returns-service"));
});

describe("returnsService", () => {
  it("creates RMA with mapped return reason and refund totals", async () => {
    const { order, listingId, buyerId, price, quantity } = await seedOrder({
      price: 120,
      quantity: 2,
    });

    const rmaId = await returnsService.initiateReturn({
      orderId: order._id.toString(),
      buyerId,
      items: [
        {
          listingId,
          quantity,
          reason: "changed_mind",
          comments: "No longer needed",
        },
      ],
      buyerPhotos: ["https://example.com/photo.jpg"],
    });

    const rma = await SouqRMA.findById(rmaId).lean();

    expect(rma?.rmaId).toMatch(/^RMA-/);
    expect(rma?.items[0]?.returnReason).toBe("no_longer_needed");
    expect(rma?.refund.amount).toBe(price * quantity);
    expect(rma?.status).toBe("initiated");
    expect(rma?.buyerNotes).toContain("No longer needed");
    expect(mockAddJob).toHaveBeenCalled();
  });

  it("generates label then processes refund after inspection", async () => {
    const { order, listingId, buyerId, price, quantity } = await seedOrder({
      price: 100,
      quantity: 1,
    });

    const rmaId = await returnsService.initiateReturn({
      orderId: order._id.toString(),
      buyerId,
      items: [
        {
          listingId,
          quantity,
          reason: "changed_mind",
        },
      ],
    });

    const label = await returnsService.generateReturnLabel(rmaId);
    expect(label.carrier).toBe("SPL");
    expect(mockGetRates).toHaveBeenCalled();

    await SouqRMA.updateOne(
      { _id: rmaId },
      {
        status: "received",
        "shipping.trackingNumber": label.trackingNumber,
      },
    );

    await returnsService.inspectReturn({
      rmaId,
      inspectorId: "SYSTEM",
      condition: "good",
      restockable: true,
      inspectionNotes: "Looks fine",
    });

    const updated = await SouqRMA.findById(rmaId).lean();
    expect(updated?.status).toBe("completed");
    expect(updated?.refund.status).toBe("completed");
    expect(updated?.refund.amount).toBeCloseTo(price * quantity * 0.95, 5); // 5% deduction for "good"
    expect(mockProcessReturn).toHaveBeenCalledTimes(1);
    expect(mockAddJob).toHaveBeenCalled();
  });
});
