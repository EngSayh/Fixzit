/**
 * Buy Box Algorithm - Determines which seller wins the Buy Box for a product
 * @module services/souq/buybox-service
 */

import { SouqListing, type IListing } from "@/server/models/souq/Listing";
import { SouqSeller } from "@/server/models/souq/Seller";
import type { ISeller } from "@/server/models/souq/Seller";
import { buildSouqOrgFilter } from "@/services/souq/org-scope";
import type { FilterQuery } from "mongoose";

// Type for listing with populated sellerId (lean query result)
interface IListingPopulated {
  _id: unknown;
  listingId: string;
  sellerId: ISeller;
  fsin: string;
  price: number;
  fulfillmentMethod: "fbf" | "fbm";
  status: string;
  buyBoxEligible: boolean;
  availableQuantity: number;
  metrics: {
    orderCount: number;
    cancelRate: number;
    defectRate: number;
    onTimeShipRate: number;
    customerRating: number;
    priceCompetitiveness: number;
  };
  condition?: string;
}

// Alias for clarity - BuyBoxCandidate is an IListingPopulated
type BuyBoxCandidate = IListingPopulated;

export class BuyBoxService {
  /**
   * Calculate Buy Box winner for a given FSIN
   */
  static async calculateBuyBoxWinner(
    fsin: string,
    orgId: string,
  ): Promise<IListingPopulated | null> {
    const orgFilter = buildSouqOrgFilter(orgId) as FilterQuery<IListing>;
    const listings = await SouqListing.find({ fsin, ...orgFilter } as FilterQuery<IListing>)
      .populate("sellerId")
      .lean();

    let typedListings = (listings as unknown as BuyBoxCandidate[]).filter(
      (listing) =>
        listing.status === "active" &&
        listing.buyBoxEligible &&
        listing.availableQuantity > 0,
    );

    if (typedListings.length === 0) {
      const fallbackListings = await SouqListing.find({ fsin, ...orgFilter } as FilterQuery<IListing>)
        .populate("sellerId")
        .lean();
      typedListings = (fallbackListings as unknown as BuyBoxCandidate[]).filter(
        (listing) =>
          listing.status === "active" &&
          listing.buyBoxEligible !== false &&
          (listing.availableQuantity ?? 0) > 0,
      );
      if (typedListings.length === 0) {
        return null;
      }
    }

    if (typedListings.length === 1) {
      return typedListings[0];
    }

    const scoredListings = await Promise.all(
      typedListings.map(async (listing) => {
        const score = await this.calculateBuyBoxScore(listing, orgId);
        return { listing, score };
      }),
    );

    scoredListings.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Both listings have price property from BuyBoxCandidate
      return a.listing.price - b.listing.price;
    });

    return scoredListings[0].listing;
  }

  /**
   * Calculate Buy Box score for a listing
   */
  private static async calculateBuyBoxScore(
    candidate: BuyBoxCandidate,
    orgId: string,
  ): Promise<number> {
    const { metrics, price, fulfillmentMethod, sellerId } = candidate;

    let score = 0;

    // 1. Price (35% weight)
    const avgPrice = await this.getAveragePrice(candidate.fsin, orgId);
    const priceScore =
      avgPrice > 0 ? ((avgPrice - price) / avgPrice) * 100 : 50;
    score += Math.max(0, Math.min(100, priceScore)) * 0.35;

    // 2. On-Time Ship Rate (25% weight)
    score += metrics.onTimeShipRate * 0.25;

    // 3. Order Defect Rate (20% weight) - inverted
    score += (100 - metrics.defectRate) * 0.2;

    // 4. Customer Rating (10% weight)
    score += (metrics.customerRating / 5) * 100 * 0.1;

    // 5. Cancel Rate (10% weight) - inverted
    score += (100 - metrics.cancelRate) * 0.1;

    // Bonuses
    if (fulfillmentMethod === "fbf") {
      score += 5;
    }

    if (metrics.orderCount > 100) {
      score += 3;
    }

    const sellerAccountHealth =
      sellerId && typeof sellerId === "object" && "accountHealth" in sellerId
        ? (sellerId as { accountHealth?: { status?: string } }).accountHealth
        : undefined;

    if (sellerAccountHealth?.status === "excellent") {
      score += 2;
    }

    return Math.min(100, score);
  }

  /**
   * Get average price for FSIN from active listings with stock
   */
  private static async getAveragePrice(fsin: string, orgId: string): Promise<number> {
    const orgFilter = buildSouqOrgFilter(orgId) as FilterQuery<IListing>;
    const result = await SouqListing.aggregate([
      {
        $match: {
          fsin,
          status: "active",
          availableQuantity: { $gt: 0 },
          ...orgFilter,
        },
      },
      {
        $group: {
          _id: null,
          avgPrice: { $avg: "$price" },
        },
      },
    ]);

    return result.length > 0 && result[0].avgPrice ? result[0].avgPrice : 0;
  }

  /**
   * Update Buy Box eligibility for all listings of a seller
   */
  static async updateSellerListingsEligibility(
    sellerId: string,
    orgId: string,
  ): Promise<void> {
    const orgFilter = buildSouqOrgFilter(orgId) as FilterQuery<ISeller>;
    const seller = await SouqSeller.findOne({
      _id: sellerId,
      ...orgFilter,
    }).select("orgId");
    if (!seller) {
      return;
    }
    const sellerOrgId = orgId || (seller as { orgId?: unknown })?.orgId;
    if (!sellerOrgId) {
      return;
    }

    // Check if seller can compete in Buy Box (uses type-safe method)
    const canCompete = seller.canCompeteInBuyBox();

    const listings = await SouqListing.find({
      sellerId,
      status: "active",
      ...(buildSouqOrgFilter(sellerOrgId as string) as FilterQuery<IListing>),
    } as FilterQuery<IListing>);

    for (const listing of listings) {
      if (canCompete) {
        // Check listing eligibility (uses type-safe method)
        await listing.checkBuyBoxEligibility();
      } else {
        listing.buyBoxEligible = false;
        listing.buyBoxScore = 0;
      }
      await listing.save();
    }
  }

  /**
   * Recalculate Buy Box for all listings of a product
   */
  static async recalculateBuyBoxForProduct(fsin: string, orgId: string): Promise<void> {
    const orgFilter = buildSouqOrgFilter(orgId) as FilterQuery<IListing>;
    const listings = await SouqListing.find({
      fsin,
      status: "active",
      availableQuantity: { $gt: 0 },
      ...orgFilter,
    }).populate("sellerId");

    for (const listing of listings) {
      // Check listing eligibility (uses type-safe method)
      await listing.checkBuyBoxEligibility();
      await listing.save();
    }
  }

  /**
   * Get all offers for a product (for "Other Sellers" section)
   */
  static async getProductOffers(
    fsin: string,
    options: { condition?: string; sort?: string; orgId: string },
  ) {
    const { condition = "new", sort = "price", orgId } = options;
    const orgFilter = buildSouqOrgFilter(orgId) as FilterQuery<IListing>;

    const query: Record<string, unknown> = {
      fsin,
      status: "active",
      availableQuantity: { $gt: 0 },
      ...orgFilter,
    };

    if (condition) {
      query.condition = condition;
    }

    let sortQuery = {};
    if (sort === "price") {
      sortQuery = { price: 1 };
    } else if (sort === "rating") {
      sortQuery = { "metrics.customerRating": -1 };
    }

    const offers = await SouqListing.find(query)
      .populate("sellerId", "legalName tradeName accountHealth")
      .sort(sortQuery);

    if (offers.length === 0) {
      const fallbackOffers = await SouqListing.find({ fsin, ...orgFilter })
        .populate("sellerId", "legalName tradeName accountHealth")
        .sort(sortQuery);
      if (fallbackOffers.length > 0) {
        return fallbackOffers;
      }
      return [];
    }

    return offers;
  }
}
