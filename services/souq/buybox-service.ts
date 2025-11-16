/**
 * Buy Box Algorithm - Determines which seller wins the Buy Box for a product
 * @module services/souq/buybox-service
 */

import { SouqListing } from '@/server/models/souq/Listing';
import { SouqSeller } from '@/server/models/souq/Seller';
import type { ISeller } from '@/server/models/souq/Seller';
import type { IListing } from '@/server/models/souq/Listing';

interface BuyBoxCandidate {
  sellerId: ISeller;
  fsin: string;
  price: number;
  fulfillmentMethod: 'fbf' | 'fbm';
  metrics: {
    orderCount: number;
    cancelRate: number;
    defectRate: number;
    onTimeShipRate: number;
    customerRating: number;
  };
}

export class BuyBoxService {
  /**
   * Calculate Buy Box winner for a given FSIN
   */
  static async calculateBuyBoxWinner(fsin: string): Promise<unknown> {
    const listings = (await SouqListing.find({
      fsin,
      status: 'active',
      buyBoxEligible: true,
      availableQuantity: { $gt: 0 },
    })
      .populate('sellerId')
      .lean()) as unknown as BuyBoxCandidate[];

    if (listings.length === 0) {
      return null;
    }

    if (listings.length === 1) {
      return listings[0];
    }

    const scoredListings = await Promise.all(
      listings.map(async (listing) => {
        const score = await this.calculateBuyBoxScore(listing);
        return { listing, score };
      })
    );

    scoredListings.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (a.listing as unknown as IListing).price - (b.listing as unknown as IListing).price;
    });

    return scoredListings[0].listing as unknown;
  }

  /**
   * Calculate Buy Box score for a listing
   */
  private static async calculateBuyBoxScore(candidate: BuyBoxCandidate): Promise<number> {
    const { metrics, price, fulfillmentMethod, sellerId } = candidate;

    let score = 0;

    // 1. Price (35% weight)
    const avgPrice = await this.getAveragePrice(candidate.fsin);
    const priceScore = avgPrice > 0 ? ((avgPrice - price) / avgPrice) * 100 : 50;
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
    if (fulfillmentMethod === 'fbf') {
      score += 5;
    }

    if (metrics.orderCount > 100) {
      score += 3;
    }

    if (sellerId.accountHealth.status === 'excellent') {
      score += 2;
    }

    return Math.min(100, score);
  }

  /**
   * Get average price for FSIN from active listings with stock
   */
  private static async getAveragePrice(fsin: string): Promise<number> {
    const result = await SouqListing.aggregate([
      {
        $match: {
          fsin,
          status: 'active',
          availableQuantity: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          avgPrice: { $avg: '$price' },
        },
      },
    ]);

    return result.length > 0 && result[0].avgPrice ? result[0].avgPrice : 0;
  }

  /**
   * Update Buy Box eligibility for all listings of a seller
   */
  static async updateSellerListingsEligibility(sellerId: string): Promise<void> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      return;
    }

    // Check if seller can compete in Buy Box (uses type-safe method)
    const canCompete = seller.canCompeteInBuyBox();

    const listings = await SouqListing.find({
      sellerId,
      status: 'active',
    });

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
  static async recalculateBuyBoxForProduct(fsin: string): Promise<void> {
    const listings = await SouqListing.find({
      fsin,
      status: 'active',
      availableQuantity: { $gt: 0 },
    }).populate('sellerId');

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
    options: { condition?: string; sort?: string } = {}
  ) {
    const { condition = 'new', sort = 'price' } = options;

    const query: Record<string, unknown> = {
      fsin,
      status: 'active',
      availableQuantity: { $gt: 0 },
    };

    if (condition) {
      query.condition = condition;
    }

    let sortQuery = {};
    if (sort === 'price') {
      sortQuery = { price: 1 };
    } else if (sort === 'rating') {
      sortQuery = { 'metrics.customerRating': -1 };
    }

    return SouqListing.find(query)
      .populate('sellerId', 'legalName tradeName accountHealth')
      .sort(sortQuery);
  }
}
