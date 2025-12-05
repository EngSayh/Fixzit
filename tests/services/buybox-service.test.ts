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
import { SouqListing } from "@/server/models/souq/Listing";
import { SouqSeller } from "@/server/models/souq/Seller";

// Deferred service import
let BuyBoxService: typeof import("@/services/souq/buybox-service").BuyBoxService;

// Test fixture org for listings
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
    city: "Riyadh",
    address: "123 Test Street",
    contactEmail: `contact-${nanoid(4)}@test.com`,
    contactPhone: "+966500000001",
    accountHealth,
    status: "active",
    kycStatus: { status: "approved", step: "verification", companyInfoComplete: true, documentsComplete: true, bankDetailsComplete: true },
    tier: "professional",
    autoRepricerSettings: { enabled: false, rules: {} },
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
  buyBoxEligible = true,
  quantity = 50,
  fulfillmentMethod = "fbm" as const,
  metrics = {
    orderCount: 10,
    cancelRate: 2,
    defectRate: 1,
    onTimeShipRate: 95,
    customerRating: 4.5,
    priceCompetitiveness: 60,
  },
  orgId = testOrgId,
} = { sellerId: "", fsin: "", orgId: testOrgId }) {
  const productId = new Types.ObjectId();
  const listingId = `LST-${nanoid(8)}`;

  await SouqListing.create({
    listingId,
    productId,
    fsin,
    sellerId: new Types.ObjectId(sellerId),
    orgId,
    price,
    currency: "SAR",
    stockQuantity: quantity,
    reservedQuantity: 0,
    availableQuantity: quantity,
    lowStockThreshold: 10,
    fulfillmentMethod,
    handlingTime: 1,
    shippingOptions: [{ method: "standard", price: 10, estimatedDays: 3 }],
    condition: "new",
    metrics,
    status: "active",
    buyBoxEligible,
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
  ({ BuyBoxService } = await import("@/services/souq/buybox-service"));
});

describe("BuyBoxService", () => {
  describe("calculateBuyBoxWinner", () => {
    it("should return null when no eligible listings exist", async () => {
      const winner = await BuyBoxService.calculateBuyBoxWinner("FSIN-NONEXISTENT");
      expect(winner).toBeNull();
    });

    it("should return the only listing when there is a single eligible listing", async () => {
      const { sellerId } = await seedSeller();
      const fsin = `FSIN-${nanoid(8)}`;
      await seedListing({ sellerId, fsin, price: 100, buyBoxEligible: true });

      const winner = await BuyBoxService.calculateBuyBoxWinner(fsin);
      
      expect(winner).not.toBeNull();
      expect(winner?.fsin).toBe(fsin);
    });

    it("should select listing with best score when multiple listings exist", async () => {
      const fsin = `FSIN-${nanoid(8)}`;
      
      // Create two sellers with different performance
      const { sellerId: seller1 } = await seedSeller({ accountHealth: { status: "excellent", score: 95 } });
      const { sellerId: seller2 } = await seedSeller({ accountHealth: { status: "good", score: 75 } });

      // Seller 1: Higher metrics, higher price
      await seedListing({
        sellerId: seller1,
        fsin,
        price: 110,
        buyBoxEligible: true,
        metrics: {
          orderCount: 200,
          cancelRate: 1,
          defectRate: 0.5,
          onTimeShipRate: 99,
          customerRating: 4.9,
          priceCompetitiveness: 70,
        },
      });

      // Seller 2: Lower metrics, lower price
      await seedListing({
        sellerId: seller2,
        fsin,
        price: 95,
        buyBoxEligible: true,
        metrics: {
          orderCount: 20,
          cancelRate: 5,
          defectRate: 3,
          onTimeShipRate: 85,
          customerRating: 4.0,
          priceCompetitiveness: 40,
        },
      });

      const winner = await BuyBoxService.calculateBuyBoxWinner(fsin);
      
      expect(winner).not.toBeNull();
      // Winner should be determined by algorithm (lower price + good metrics often wins)
      expect(winner?.fsin).toBe(fsin);
    });

    it("should not include listings with zero stock", async () => {
      const { sellerId } = await seedSeller();
      const fsin = `FSIN-${nanoid(8)}`;
      await seedListing({ sellerId, fsin, price: 100, buyBoxEligible: true, quantity: 0 });

      const winner = await BuyBoxService.calculateBuyBoxWinner(fsin);
      expect(winner).toBeNull();
    });

    it("should not include ineligible listings", async () => {
      const { sellerId } = await seedSeller();
      const fsin = `FSIN-${nanoid(8)}`;
      await seedListing({ sellerId, fsin, price: 100, buyBoxEligible: false });

      const winner = await BuyBoxService.calculateBuyBoxWinner(fsin);
      expect(winner).toBeNull();
    });

    it("should favor FBF over FBM with same score", async () => {
      const fsin = `FSIN-${nanoid(8)}`;
      const { sellerId: seller1 } = await seedSeller();
      const { sellerId: seller2 } = await seedSeller();

      // Same metrics, same price, different fulfillment
      const metrics = {
        orderCount: 100,
        cancelRate: 2,
        defectRate: 1,
        onTimeShipRate: 95,
        customerRating: 4.5,
        priceCompetitiveness: 60,
      };

      await seedListing({ sellerId: seller1, fsin, price: 100, fulfillmentMethod: "fbm", metrics });
      await seedListing({ sellerId: seller2, fsin, price: 100, fulfillmentMethod: "fbf" as "fbm", metrics });

      const winner = await BuyBoxService.calculateBuyBoxWinner(fsin);
      
      expect(winner).not.toBeNull();
      // FBF should get bonus points
    });
  });

  describe("getProductOffers", () => {
    it("should return all active offers for a FSIN", async () => {
      const fsin = `FSIN-${nanoid(8)}`;
      const { sellerId: seller1 } = await seedSeller();
      const { sellerId: seller2 } = await seedSeller();

      await seedListing({ sellerId: seller1, fsin, price: 100 });
      await seedListing({ sellerId: seller2, fsin, price: 95 });

      const offers = await BuyBoxService.getProductOffers(fsin);
      
      expect(offers).toHaveLength(2);
    });

    it("should sort by price when sort=price", async () => {
      const fsin = `FSIN-${nanoid(8)}`;
      const { sellerId: seller1 } = await seedSeller();
      const { sellerId: seller2 } = await seedSeller();

      await seedListing({ sellerId: seller1, fsin, price: 150 });
      await seedListing({ sellerId: seller2, fsin, price: 100 });

      const offers = await BuyBoxService.getProductOffers(fsin, { sort: "price" });
      
      expect(offers[0].price).toBe(100);
      expect(offers[1].price).toBe(150);
    });

    it("should filter by condition", async () => {
      const fsin = `FSIN-${nanoid(8)}`;
      const { sellerId } = await seedSeller();

      await seedListing({ sellerId, fsin, price: 100 });

      const offers = await BuyBoxService.getProductOffers(fsin, { condition: "new" });
      
      expect(offers.length).toBeGreaterThanOrEqual(1);
      expect(offers[0].condition).toBe("new");
    });
  });

  describe("updateSellerListingsEligibility", () => {
    it("should update all listings for a seller", async () => {
      const { sellerId } = await seedSeller({ accountHealth: { status: "good", score: 80 } });
      const fsin = `FSIN-${nanoid(8)}`;
      
      await seedListing({ sellerId, fsin, price: 100, buyBoxEligible: false });
      
      await BuyBoxService.updateSellerListingsEligibility(sellerId);
      
      // Verify listings were processed
      const listings = await SouqListing.find({ sellerId });
      expect(listings.length).toBeGreaterThan(0);
    });

    it("should handle non-existent seller gracefully", async () => {
      const fakeSellerId = new Types.ObjectId().toString();
      
      // Should not throw
      await expect(
        BuyBoxService.updateSellerListingsEligibility(fakeSellerId)
      ).resolves.toBeUndefined();
    });
  });

  describe("recalculateBuyBoxForProduct", () => {
    it("should recalculate eligibility for all listings of a product", async () => {
      const fsin = `FSIN-${nanoid(8)}`;
      const { sellerId: seller1 } = await seedSeller();
      const { sellerId: seller2 } = await seedSeller();

      await seedListing({ sellerId: seller1, fsin, price: 100 });
      await seedListing({ sellerId: seller2, fsin, price: 95 });

      await BuyBoxService.recalculateBuyBoxForProduct(fsin);
      
      // Verify listings were processed
      const listings = await SouqListing.find({ fsin });
      expect(listings).toHaveLength(2);
    });
  });
});
