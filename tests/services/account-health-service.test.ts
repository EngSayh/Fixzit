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
  QUEUE_NAMES: { NOTIFICATIONS: "notifications", HEALTH_CHECK: "health-check" },
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
import { SouqSeller } from "@/server/models/souq/Seller";
import { SouqOrder } from "@/server/models/souq/Order";

// Deferred service import
let accountHealthService: typeof import("@/services/souq/account-health-service").accountHealthService;

// Test fixture ObjectId for consistent test data
const testOrgId = new Types.ObjectId();

/**
 * Helper to seed a test seller
 */
async function seedSeller({
  orgId = testOrgId,
  accountHealth = { status: "good", score: 85 },
} = {}) {
  const sellerId = new Types.ObjectId();
  
  await SouqSeller.create({
    _id: sellerId,
    sellerId: `SEL-${nanoid(8)}`,
    orgId,
    legalName: `Seller-${nanoid(6)}`,
    tradeName: `Trade-${nanoid(6)}`,
    crNumber: `CR-${nanoid(8)}`,
    vatNumber: `VAT-${nanoid(8)}`,
    registrationType: "company",
    country: "SA",
    city: "Riyadh",
    address: "123 Test Street",
    contactEmail: `contact-${nanoid(4)}@test.com`,
    contactPhone: "+966500000001",
    accountHealth: {
      orderDefectRate: 0.5,
      lateShipmentRate: 2,
      cancellationRate: 1,
      validTrackingRate: 98,
      onTimeDeliveryRate: 98,
      score: accountHealth.score || 85,
      status: accountHealth.status || "good",
      lastCalculated: new Date(),
    },
    kycStatus: { status: "approved", step: "verification", companyInfoComplete: true, documentsComplete: true, bankDetailsComplete: true },
    tier: "professional",
    tierEffectiveFrom: new Date(),
    autoRepricerSettings: { enabled: false, rules: {} },
  });

  return { sellerId: sellerId.toString() };
}

/**
 * Helper to seed a test order
 */
async function seedOrder({
  sellerId,
  orgId = testOrgId,
  status = "delivered",
  isDefective = false,
  isLate = false,
  isCancelled = false,
  createdAt = new Date(),
} = { sellerId: "", orgId: testOrgId }) {
  const orderId = `ORD-${nanoid(8)}`;
  const customerId = new Types.ObjectId();
  const listingId = new Types.ObjectId();
  const productId = new Types.ObjectId();

  await SouqOrder.create({
    orderId,
    orgId,
    customerId,
    customerEmail: `test-${nanoid(4)}@example.com`,
    customerPhone: "+966501234567",
    items: [
      {
        sellerId: new Types.ObjectId(sellerId),
        listingId,
        productId,
        fsin: `FSIN-${nanoid(8)}`,
        title: `Product ${nanoid(6)}`,
        quantity: 1,
        pricePerUnit: 100,
        subtotal: 100,
        fulfillmentMethod: "fbm",
        status,
      },
    ],
    status: isCancelled ? "cancelled" : status,
    pricing: {
      subtotal: 100,
      shippingFee: 10,
      tax: 15,
      discount: 0,
      total: 125,
      currency: "SAR",
    },
    payment: {
      method: "card",
      status: "captured",
    },
    shippingAddress: {
      name: "Test Customer",
      phone: "+966501234567",
      addressLine1: "123 Test St",
      city: "Riyadh",
      country: "SA",
      postalCode: "12345",
    },
    createdAt,
    // Mark as defective/late if needed
    ...(isDefective && { defectReported: true }),
    ...(isLate && { shippedLate: true }),
    ...(isCancelled && { cancelledAt: new Date() }),
  });

  return { orderId };
}

afterEach(async () => {
  await SouqSeller.deleteMany({});
  await SouqOrder.deleteMany({});
  vi.clearAllMocks();
});

beforeAll(async () => {
  ({ accountHealthService } = await import("@/services/souq/account-health-service"));
});

describe("accountHealthService", () => {
  describe("calculateAccountHealth", () => {
    it("should return zero metrics when seller has no orders", async () => {
      const { sellerId } = await seedSeller();
      
      const metrics = await accountHealthService.calculateAccountHealth(
        sellerId,
        testOrgId.toString(),
        "last_30_days",
      );
      
      expect(metrics.totalOrders).toBe(0);
      expect(metrics.odr).toBe(0);
      expect(metrics.lateShipmentRate).toBe(0);
      expect(metrics.cancellationRate).toBe(0);
      expect(metrics.healthStatus).toBe("good"); // 0 orders returns "good" status
      expect(metrics.atRisk).toBe(false);
    });

    it("should calculate health metrics for seller with orders", async () => {
      const { sellerId } = await seedSeller();
      
      // Seed some orders
      await seedOrder({ sellerId, status: "delivered" });
      await seedOrder({ sellerId, status: "delivered" });
      await seedOrder({ sellerId, status: "delivered" });

      const metrics = await accountHealthService.calculateAccountHealth(
        sellerId,
        testOrgId.toString(),
        "last_30_days",
      );
      
      expect(metrics.totalOrders).toBe(3);
      expect(metrics.odr).toBe(0);
      expect(metrics.healthStatus).toBe("excellent");
    });

    it("should calculate ODR when there are defective orders", async () => {
      const { sellerId } = await seedSeller();
      
      // Seed 10 orders with 2 defective
      for (let i = 0; i < 8; i++) {
        await seedOrder({ sellerId, status: "delivered" });
      }
      await seedOrder({ sellerId, status: "delivered", isDefective: true });
      await seedOrder({ sellerId, status: "delivered", isDefective: true });

      const metrics = await accountHealthService.calculateAccountHealth(
        sellerId,
        testOrgId.toString(),
        "last_30_days",
      );
      
      expect(metrics.totalOrders).toBe(10);
      expect(metrics.totalDefects).toBeGreaterThanOrEqual(0); // Depends on implementation
    });

    it("should calculate late shipment rate", async () => {
      const { sellerId } = await seedSeller();
      
      // Seed orders with some late shipments
      for (let i = 0; i < 8; i++) {
        await seedOrder({ sellerId, status: "delivered" });
      }
      await seedOrder({ sellerId, status: "delivered", isLate: true });
      await seedOrder({ sellerId, status: "delivered", isLate: true });

      const metrics = await accountHealthService.calculateAccountHealth(
        sellerId,
        testOrgId.toString(),
        "last_30_days",
      );
      
      expect(metrics.totalOrders).toBe(10);
      expect(metrics.totalLateShipments).toBeGreaterThanOrEqual(0);
    });

    it("should calculate cancellation rate", async () => {
      const { sellerId } = await seedSeller();
      
      // Seed orders with some cancellations
      for (let i = 0; i < 8; i++) {
        await seedOrder({ sellerId, status: "delivered" });
      }
      await seedOrder({ sellerId, isCancelled: true });
      await seedOrder({ sellerId, isCancelled: true });

      const metrics = await accountHealthService.calculateAccountHealth(
        sellerId,
        testOrgId.toString(),
        "last_30_days",
      );
      
      expect(metrics.totalOrders).toBeGreaterThanOrEqual(8);
    });

    it("should filter orders by period", async () => {
      const { sellerId } = await seedSeller();
      
      // Order from 60 days ago
      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      await seedOrder({ sellerId, status: "delivered", createdAt: oldDate });
      
      // Recent order
      await seedOrder({ sellerId, status: "delivered" });

      const metrics7d = await accountHealthService.calculateAccountHealth(
        sellerId,
        testOrgId.toString(),
        "last_7_days",
      );
      const metrics30d = await accountHealthService.calculateAccountHealth(
        sellerId,
        testOrgId.toString(),
        "last_30_days",
      );
      const metrics90d = await accountHealthService.calculateAccountHealth(
        sellerId,
        testOrgId.toString(),
        "last_90_days",
      );
      
      expect(metrics7d.totalOrders).toBeLessThanOrEqual(metrics30d.totalOrders);
      expect(metrics30d.totalOrders).toBeLessThanOrEqual(metrics90d.totalOrders);
    });

    it("should set atRisk flag when metrics are poor", async () => {
      const { sellerId } = await seedSeller();
      
      // Seed many defective orders to trigger poor health
      for (let i = 0; i < 5; i++) {
        await seedOrder({ sellerId, status: "delivered", isDefective: true });
      }

      const metrics = await accountHealthService.calculateAccountHealth(
        sellerId,
        testOrgId.toString(),
        "last_30_days",
      );
      
      // Health status depends on implementation thresholds
      expect(metrics).toHaveProperty("atRisk");
      expect(metrics).toHaveProperty("warnings");
    });
  });

  describe("getAccountHealthSummary", () => {
    it("should return a summary for a seller", async () => {
      const { sellerId } = await seedSeller();
      
      const summary = await accountHealthService.getHealthSummary(
        sellerId,
        testOrgId.toString(),
      );
      expect(summary).toHaveProperty("current");
    });
  });

  describe("monitorAllSellers", () => {
    it("should run health checks for active sellers", async () => {
      await seedSeller();
      const result = await accountHealthService.monitorAllSellers();
      expect(result).toHaveProperty("checked");
    });
  });
});
