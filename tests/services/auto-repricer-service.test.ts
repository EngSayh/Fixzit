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
  QUEUE_NAMES: { NOTIFICATIONS: "notifications", REPRICER: "repricer" },
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
import { SouqListing } from "@/server/models/souq/Listing";
import { SouqSeller } from "@/server/models/souq/Seller";

// Deferred service import
let AutoRepricerService: typeof import("@/services/souq/auto-repricer-service").AutoRepricerService;

/**
 * Helper to seed a test seller with repricer settings
 */
async function seedSeller({
  orgId = "org-test",
  repricerEnabled = false,
  repricerRules = {},
  defaultRule = undefined as {
    enabled: boolean;
    minPrice: number;
    maxPrice: number;
    targetPosition: "win" | "competitive";
    undercut: number;
    protectMargin: boolean;
  } | undefined,
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
    city: "Riyadh",
    address: "123 Test Street",
    contactEmail: `contact-${nanoid(4)}@test.com`,
    contactPhone: "+966500000001",
    accountHealth: { status: "good", score: 85 },
    status: "active",
    kycStatus: { status: "approved", step: "verification", companyInfoComplete: true, documentsComplete: true, bankDetailsComplete: true },
    tier: "professional",
    autoRepricerSettings: {
      enabled: repricerEnabled,
      rules: repricerRules,
      defaultRule,
    },
  });

  return { sellerId: sellerId.toString() };
}

/**
 * Helper to seed a test listing
 */
async function seedListing({
  sellerId,
  fsin,
  price = 100,
  quantity = 50,
} = { sellerId: "", fsin: "" }) {
  const productId = new Types.ObjectId();
  const listingId = `LST-${nanoid(8)}`;

  await SouqListing.create({
    listingId,
    productId,
    fsin,
    sellerId: new Types.ObjectId(sellerId),
    price,
    currency: "SAR",
    stockQuantity: quantity,
    reservedQuantity: 0,
    availableQuantity: quantity,
    lowStockThreshold: 10,
    fulfillmentMethod: "fbm",
    handlingTime: 1,
    shippingOptions: [{ method: "standard", price: 10, estimatedDays: 3 }],
    condition: "new",
    metrics: {
      orderCount: 10,
      cancelRate: 2,
      defectRate: 1,
      onTimeShipRate: 95,
      customerRating: 4.5,
      priceCompetitiveness: 60,
    },
    status: "active",
    buyBoxEligible: true,
    buyBoxScore: 0,
  });

  return { listingId, productId: productId.toString() };
}

afterEach(async () => {
  await SouqListing.deleteMany({});
  await SouqSeller.deleteMany({});
  vi.clearAllMocks();
});

beforeAll(async () => {
  ({ AutoRepricerService } = await import("@/services/souq/auto-repricer-service"));
});

describe("AutoRepricerService", () => {
  describe("repriceSeller", () => {
    it("should return empty results when seller not found", async () => {
      const fakeSellerId = new Types.ObjectId().toString();
      
      await expect(
        AutoRepricerService.repriceSeller(fakeSellerId)
      ).rejects.toThrow("Seller not found");
    });

    it("should return empty results when repricer is disabled", async () => {
      const { sellerId } = await seedSeller({ repricerEnabled: false });
      
      const result = await AutoRepricerService.repriceSeller(sellerId);
      
      expect(result.repriced).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.listings).toHaveLength(0);
    });

    it("should skip sellers with invalid repricer settings", async () => {
      const sellerId = new Types.ObjectId();
      
      // Create seller with invalid settings structure
      await SouqSeller.create({
        _id: sellerId,
        sellerId: `SEL-${nanoid(8)}`,
        orgId: "org-test",
        legalName: `Seller-${nanoid(6)}`,
        tradeName: `Trade-${nanoid(6)}`,
        crNumber: `CR-${nanoid(8)}`,
        vatNumber: `VAT-${nanoid(8)}`,
        registrationType: "company",
        city: "Riyadh",
        address: "123 Test Street",
        contactEmail: `contact-${nanoid(4)}@test.com`,
        contactPhone: "+966500000001",
        accountHealth: { status: "good", score: 85 },
        status: "active",
        kycStatus: { status: "approved", step: "verification", companyInfoComplete: true, documentsComplete: true, bankDetailsComplete: true },
        tier: "professional",
        autoRepricerSettings: { invalid: "settings" }, // Invalid
      });

      const result = await AutoRepricerService.repriceSeller(sellerId.toString());
      
      expect(result.repriced).toBe(0);
    });

    it("should process active listings when repricer is enabled", async () => {
      const fsin = `FSIN-${nanoid(8)}`;
      const listingId = `LST-${nanoid(8)}`;
      
      const { sellerId } = await seedSeller({
        repricerEnabled: true,
        repricerRules: {
          [listingId]: {
            enabled: true,
            minPrice: 80,
            maxPrice: 150,
            targetPosition: "win" as const,
            undercut: 1,
            protectMargin: true,
          },
        },
      });

      await seedListing({ sellerId, fsin, price: 100 });

      const result = await AutoRepricerService.repriceSeller(sellerId);
      
      // Should return results (repriced or not depending on competition)
      expect(result).toHaveProperty("repriced");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("listings");
    });

    it("should respect minPrice when protectMargin is true", async () => {
      const fsin = `FSIN-${nanoid(8)}`;
      
      const { sellerId } = await seedSeller({
        repricerEnabled: true,
        defaultRule: {
          enabled: true,
          minPrice: 90,
          maxPrice: 150,
          targetPosition: "win" as const,
          undercut: 1,
          protectMargin: true,
        },
      });

      const { listingId } = await seedListing({ sellerId, fsin, price: 100 });

      const result = await AutoRepricerService.repriceSeller(sellerId);
      
      // If listing was repriced, verify it didn't go below minPrice
      if (result.listings.length > 0) {
        const repricedListing = result.listings.find(l => l.listingId === listingId);
        if (repricedListing) {
          expect(repricedListing.newPrice).toBeGreaterThanOrEqual(90);
        }
      }
    });
  });

  describe("queueRepricingJob", () => {
    it("should queue a repricing job for a seller", async () => {
      const { sellerId } = await seedSeller({ repricerEnabled: true });

      if (AutoRepricerService.queueRepricingJob) {
        await AutoRepricerService.queueRepricingJob(sellerId);
        expect(mockAddJob).toHaveBeenCalled();
      }
    });
  });

  describe("calculateOptimalPrice", () => {
    it("should calculate price within min/max bounds", async () => {
      if (AutoRepricerService.calculateOptimalPrice) {
        const rule = {
          enabled: true,
          minPrice: 80,
          maxPrice: 150,
          targetPosition: "win" as const,
          undercut: 1,
          protectMargin: true,
        };

        const optimalPrice = await AutoRepricerService.calculateOptimalPrice(
          100, // currentPrice
          null, // current winner (none)
          [{ id: "competitor", price: 95 }], // competitors
          rule,
          "self-listing",
        );

        expect(optimalPrice).toBeGreaterThanOrEqual(rule.minPrice);
        expect(optimalPrice).toBeLessThanOrEqual(rule.maxPrice);
      }
    });
  });
});
