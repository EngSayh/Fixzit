import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { Types } from "mongoose";
import { nanoid } from "nanoid";

// Hoist mock setup
const { mockAddJob } = vi.hoisted(() => ({
  mockAddJob: vi.fn(async () => undefined),
}));

// Mock external dependencies
vi.mock("@/lib/queues/setup", () => ({
  addJob: mockAddJob,
  QUEUE_NAMES: { NOTIFICATIONS: "notifications" },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import models after mocks
import { SouqInventory } from "@/server/models/souq/Inventory";
import { SouqListing } from "@/server/models/souq/Listing";

// Deferred service import
let inventoryService: typeof import("@/services/souq/inventory-service").inventoryService;

/**
 * Helper to seed a test listing and inventory
 */
// Test fixture ObjectId for consistent test data
const testOrgId = new Types.ObjectId();
const otherOrgId = new Types.ObjectId();
const testOrgIdStr = testOrgId.toString();
const otherOrgIdStr = otherOrgId.toString();

async function seedInventory({
  quantity = 100,
  reservedQuantity = 0,
  fulfillmentType = "FBM" as const,
  lowStockThreshold = 10,
  orgId = testOrgId,
} = {}) {
  const sellerId = new Types.ObjectId();
  const productId = new Types.ObjectId();
  const listingId = `LST-${nanoid(8)}`;
  const inventoryId = `INV-${nanoid(8)}`;

  // Create listing first
  await SouqListing.create({
    listingId,
    productId,
    fsin: `FSIN-${nanoid(6)}`,
    sellerId,
    orgId,
    price: 100,
    currency: "SAR",
    stockQuantity: quantity,
    reservedQuantity,
    availableQuantity: quantity - reservedQuantity,
    lowStockThreshold,
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

  // Create inventory record
  await SouqInventory.create({
    inventoryId,
    listingId,
    productId,
    sellerId,
    orgId,
    availableQuantity: quantity - reservedQuantity,
    totalQuantity: quantity,
    reservedQuantity,
    fulfillmentType,
    lowStockThreshold,
    reservations: [],
    transactions: [
      {
        transactionId: `TXN-${nanoid(8)}`,
        type: "receive",
        quantity,
        reason: "Initial seed",
        performedBy: "SYSTEM",
        performedAt: new Date(),
      },
    ],
    health: {
      sellableUnits: quantity - reservedQuantity,
      unsellableUnits: 0,
      inboundUnits: 0,
      reservedUnits: reservedQuantity,
      agingDays: 0,
      isStranded: false,
    },
    status: "active",
  });

  return {
    sellerId: sellerId.toString(),
    productId: productId.toString(),
    listingId,
    inventoryId,
    quantity,
  };
}

afterEach(async () => {
  await SouqInventory.deleteMany({});
  await SouqListing.deleteMany({});
  vi.clearAllMocks();
});

beforeAll(async () => {
  ({ inventoryService } = await import("@/services/souq/inventory-service"));
});

describe("inventoryService", () => {
  describe("reserveInventory", () => {
    it("should reserve inventory successfully when stock is available", async () => {
      const { listingId } = await seedInventory({ quantity: 50 });
      const reservationId = `RES-${nanoid(8)}`;

      const result = await inventoryService.reserveInventory({
        listingId,
        quantity: 5,
        reservationId,
        orgId: testOrgIdStr,
        expirationMinutes: 15,
      });

      expect(result).toBe(true);

      // Verify inventory was updated
      const inventory = await SouqInventory.findOne({ listingId });
      expect(inventory?.reservedQuantity).toBe(5);
      expect(inventory?.availableQuantity).toBe(45);
      expect(inventory?.reservations).toContainEqual(
        expect.objectContaining({
          reservationId,
          quantity: 5,
          status: "active",
        }),
      );
    });

    it("should return false when insufficient stock is available", async () => {
      const { listingId } = await seedInventory({ quantity: 5 });
      const reservationId = `RES-${nanoid(8)}`;

      const result = await inventoryService.reserveInventory({
        listingId,
        quantity: 10, // More than available
        reservationId,
        orgId: testOrgIdStr,
      });

      expect(result).toBe(false);
    });

    it("should return false when org scope does not match", async () => {
      const { listingId } = await seedInventory({ quantity: 10, orgId: otherOrgId });
      const reservationId = `RES-${nanoid(8)}`;

      const result = await inventoryService.reserveInventory({
        listingId,
        quantity: 2,
        reservationId,
        orgId: testOrgId.toString(),
      });

      expect(result).toBe(false);
    });

    it("should return false when listing/inventory not found", async () => {
      const result = await inventoryService.reserveInventory({
        listingId: "non-existent-listing",
        quantity: 5,
        reservationId: "res-1",
        orgId: testOrgIdStr,
      });

      expect(result).toBe(false);
    });
  });

  describe("releaseReservation", () => {
    it("should release reservation and restore available quantity", async () => {
      const { listingId } = await seedInventory({ quantity: 50 });
      const reservationId = `RES-${nanoid(8)}`;

      // First reserve
      await inventoryService.reserveInventory({
        listingId,
        quantity: 10,
        reservationId,
        orgId: testOrgIdStr,
      });

      // Then release
      const result = await inventoryService.releaseReservation({
        listingId,
        reservationId,
        orgId: testOrgIdStr,
      });

      expect(result).toBe(true);

      // Verify inventory was restored
      const inventory = await SouqInventory.findOne({ listingId });
      expect(inventory?.reservedQuantity).toBe(0);
      expect(inventory?.availableQuantity).toBe(50);
    });
  });

  describe("convertReservationToSale", () => {
    it("should convert reservation and reduce total/available quantity", async () => {
      const { listingId } = await seedInventory({ quantity: 20, orgId: otherOrgId });
      const reservationId = `RES-${nanoid(8)}`;
      const orderId = `ORD-${nanoid(8)}`;

      await inventoryService.reserveInventory({
        listingId,
        quantity: 5,
        reservationId,
        orgId: otherOrgId.toString(),
      });

      const converted = await inventoryService.convertReservationToSale({
        listingId,
        reservationId,
        orderId,
        orgId: otherOrgId.toString(),
      });

      expect(converted).toBe(true);

      const inventory = await SouqInventory.findOne({ listingId });
      expect(inventory?.reservedQuantity).toBe(0);
      expect(inventory?.totalQuantity).toBe(15);
      expect(inventory?.health.sellableUnits).toBe(15);
    });
  });

  describe("getInventory", () => {
    it("should return inventory for existing listing", async () => {
      const { listingId, quantity } = await seedInventory({ quantity: 100 });

      const result = await inventoryService.getInventory(listingId, testOrgIdStr);

      expect(result).not.toBeNull();
      expect(result?.listingId).toBe(listingId);
      expect(result?.totalQuantity).toBe(quantity);
    });

    it("should return null for non-existent listing", async () => {
      const result = await inventoryService.getInventory("non-existent", testOrgIdStr);
      expect(result).toBeNull();
    });
  });
});
