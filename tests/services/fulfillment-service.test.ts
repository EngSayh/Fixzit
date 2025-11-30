import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { Types } from "mongoose";
import { SouqOrder } from "@/server/models/souq/Order";

// Hoist mock setup
const { mockAramexGetRates, mockSmsaGetRates, mockSplGetRates } = vi.hoisted(() => ({
  mockAramexGetRates: vi.fn(async () => [
    { carrier: "Aramex", serviceType: "express", cost: 30, estimatedDays: 1 },
    { carrier: "Aramex", serviceType: "standard", cost: 15, estimatedDays: 3 },
  ]),
  mockSmsaGetRates: vi.fn(async () => [
    { carrier: "SMSA", serviceType: "express", cost: 28, estimatedDays: 1 },
  ]),
  mockSplGetRates: vi.fn(async () => [
    { carrier: "SPL", serviceType: "standard", cost: 12, estimatedDays: 5 },
  ]),
}));

// Mock dependencies
vi.mock("@/lib/queues/setup", () => ({
  addJob: vi.fn(async () => undefined),
  QUEUE_NAMES: { NOTIFICATIONS: "notifications" },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/carriers/aramex", () => ({
  aramexCarrier: {
    name: "Aramex",
    createShipment: vi.fn(),
    getTracking: vi.fn(),
    cancelShipment: vi.fn(),
    getRates: mockAramexGetRates,
  },
}));

vi.mock("@/lib/carriers/smsa", () => ({
  smsaCarrier: {
    name: "SMSA",
    createShipment: vi.fn(),
    getTracking: vi.fn(),
    cancelShipment: vi.fn(),
    getRates: mockSmsaGetRates,
  },
}));

vi.mock("@/lib/carriers/spl", () => ({
  splCarrier: {
    name: "SPL",
    createShipment: vi.fn(),
    getTracking: vi.fn(),
    cancelShipment: vi.fn(),
    getRates: mockSplGetRates,
  },
}));

let fulfillmentService: typeof import("@/services/souq/fulfillment-service").fulfillmentService;

afterEach(async () => {
  await SouqOrder.deleteMany({});
  vi.clearAllMocks();
});

beforeAll(async () => {
  ({ fulfillmentService } = await import("@/services/souq/fulfillment-service"));
});

describe("fulfillmentService", () => {
  describe("getRates", () => {
    it("should aggregate rates from all carriers sorted by cost", async () => {
      const rates = await fulfillmentService.getRates({
        origin: "Riyadh",
        destination: "Jeddah",
        weight: 2.5,
        serviceType: "standard",
      });
      expect(rates.length).toBeGreaterThan(0);
      for (let i = 1; i < rates.length; i++) {
        expect(rates[i].cost).toBeGreaterThanOrEqual(rates[i - 1].cost);
      }
    });

    it("should handle carrier failures gracefully", async () => {
      mockAramexGetRates.mockRejectedValueOnce(new Error("Network error"));
      const rates = await fulfillmentService.getRates({
        origin: "Riyadh",
        destination: "Dammam",
        weight: 1.0,
        serviceType: "express",
      });
      expect(rates.length).toBeGreaterThan(0);
    });
  });

  describe("calculateSLA", () => {
    it("should compute SLA metrics for pending standard order", async () => {
      const orderId = `ORD-${Math.random().toString(36).slice(2, 8)}`;
      const customerId = new Types.ObjectId();
      const sellerId = new Types.ObjectId();
      const listingId = new Types.ObjectId();
      const productId = new Types.ObjectId();

      await SouqOrder.create({
        orderId,
        customerId,
        customerEmail: "buyer@example.com",
        customerPhone: "+966500000000",
        items: [
          {
            listingId,
            productId,
            fsin: "FSIN-123456",
            sellerId,
            title: "Test Product",
            quantity: 1,
            pricePerUnit: 100,
            subtotal: 100,
            fulfillmentMethod: "fbf",
            status: "pending",
          },
        ],
        shippingAddress: {
          name: "Test Buyer",
          phone: "+966500000000",
          addressLine1: "Street 1",
          city: "Riyadh",
          postalCode: "12345",
          country: "SA",
        },
        pricing: {
          subtotal: 100,
          shippingFee: 10,
          tax: 15,
          discount: 0,
          total: 125,
          currency: "SAR",
        },
        payment: { method: "card", status: "captured", transactionId: "txn_123" },
        status: "pending",
        fulfillmentStatus: "pending",
        shippingSpeed: "standard",
      });

      const sla = await fulfillmentService.calculateSLA(orderId);

      expect(sla.currentStatus).toBe("pending");
      expect(sla.isOnTime).toBe(true);
      expect(sla.handlingDeadline).toBeInstanceOf(Date);
      expect(sla.deliveryPromise).toBeInstanceOf(Date);
      expect(["normal", "warning", "critical"]).toContain(sla.urgency);
    });

    it("should throw for non-existent order", async () => {
      await expect(fulfillmentService.calculateSLA("non-existent-order")).rejects.toThrow("Order not found");
    });
  });
});
