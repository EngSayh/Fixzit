/**
 * Auto-Repricer Service - Automatically adjusts seller prices to win Buy Box
 * @module services/souq/auto-repricer-service
 */

import { SouqListing } from '@/server/models/souq/Listing';
import { SouqSeller } from '@/server/models/souq/Seller';
import { BuyBoxService } from './buybox-service';
import { addJob, QUEUE_NAMES } from '@/lib/queues/setup';

interface RepricerRule {
  enabled: boolean;
  minPrice: number;
  maxPrice: number;
  targetPosition: 'win' | 'competitive'; // 'win' = always try to win, 'competitive' = stay within range
  undercut: number; // Amount to undercut competitor (e.g., 0.01 SAR)
  protectMargin: boolean; // Don't drop below minPrice even if losing Buy Box
}

interface RepricerSettings {
  enabled: boolean;
  rules: Record<string, RepricerRule>; // Key = listingId or FSIN
  defaultRule?: RepricerRule;
}

export class AutoRepricerService {
  /**
   * Run auto-repricer for a single seller
   * This is called by the background worker every 15 minutes
   */
  static async repriceSeller(sellerId: string): Promise<{
    repriced: number;
    errors: number;
    listings: Array<{ listingId: string; oldPrice: number; newPrice: number }>;
  }> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      throw new Error('Seller not found');
    }

    // Check if seller has repricer enabled
    const settings = seller.autoRepricerSettings as unknown as RepricerSettings;
    if (!settings?.enabled) {
      return { repriced: 0, errors: 0, listings: [] };
    }

    // Get all active listings for this seller
    const listings = await SouqListing.find({
      sellerId,
      status: 'active',
      availableQuantity: { $gt: 0 }
    });

    const results: Array<{ listingId: string; oldPrice: number; newPrice: number }> = [];
    let repriced = 0;
    let errors = 0;

    for (const listing of listings) {
      try {
        // Get rule for this listing (specific rule or default)
        const rule = settings.rules[listing._id.toString()] || 
                     settings.rules[listing.fsin] || 
                     settings.defaultRule;

        if (!rule?.enabled) {
          continue;
        }

        // Get current Buy Box winner
        const winner = await BuyBoxService.calculateBuyBoxWinner(listing.fsin);
        
        // Get all competing offers
        const offers = await BuyBoxService.getProductOffers(listing.fsin, {
          condition: listing.condition
        });

        // Calculate optimal price
        const newPrice = this.calculateOptimalPrice(
          listing.price,
          winner,
          offers,
          rule,
          listing._id.toString()
        );

        // Only update if price changed
        if (newPrice !== listing.price) {
          const oldPrice = listing.price;
          listing.price = newPrice;
          listing.lastPriceChange = new Date();
          await listing.save();

          // Trigger Buy Box recalculation
          await BuyBoxService.recalculateBuyBoxForProduct(listing.fsin);

          // Log price change
          await addJob(
            QUEUE_NAMES.NOTIFICATIONS,
            'price_change_notification',
            {
              sellerId,
              listingId: listing._id.toString(),
              fsin: listing.fsin,
              oldPrice,
              newPrice,
              reason: 'auto_repricer'
            }
          );

          results.push({
            listingId: listing._id.toString(),
            oldPrice,
            newPrice
          });
          repriced++;
        }

      } catch (error) {
        console.error(`Auto-repricer error for listing ${listing._id}:`, error);
        errors++;
      }
    }

    return { repriced, errors, listings: results };
  }

  /**
   * Calculate optimal price based on competition and rules
   */
  private static calculateOptimalPrice(
    currentPrice: number,
    winner: unknown,
    offers: unknown[],
    rule: RepricerRule,
    currentListingId: string
  ): number {
    // If we're already the winner and target is 'competitive', no need to change
    if (winner && (winner as any)._id?.toString() === currentListingId && rule.targetPosition === 'competitive') {
      return currentPrice;
    }

    // Find lowest competing price (excluding our own listing)
    const competingPrices = offers
      .filter((offer: any) => offer._id?.toString() !== currentListingId)
      .map((offer: any) => offer.price)
      .sort((a, b) => a - b);

    if (competingPrices.length === 0) {
      // No competition: raise price toward the configured maximum while respecting minimums.
      const soloPrice = Math.max(rule.minPrice, rule.maxPrice);
      return Math.round(soloPrice * 100) / 100;
    }

    const lowestCompetitorPrice = competingPrices[0];

    let targetPrice: number;

    if (rule.targetPosition === 'win') {
      // Try to win Buy Box by undercutting lowest competitor
      targetPrice = lowestCompetitorPrice - rule.undercut;
    } else {
      // Stay competitive but don't necessarily win
      // Price within 5% of lowest competitor
      targetPrice = lowestCompetitorPrice * 1.05;
    }

    // Apply min/max constraints
    targetPrice = Math.max(rule.minPrice, Math.min(rule.maxPrice, targetPrice));

    // Protect margin: don't drop below minPrice even if losing
    if (rule.protectMargin && targetPrice < rule.minPrice) {
      targetPrice = rule.minPrice;
    }

    // Round to 2 decimal places
    return Math.round(targetPrice * 100) / 100;
  }

  /**
   * Enable auto-repricer for a seller
   */
  static async enableAutoRepricer(
    sellerId: string,
    settings: RepricerSettings
  ): Promise<void> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      throw new Error('Seller not found');
    }

    seller.autoRepricerSettings = settings as any;
    await seller.save();

    // Trigger immediate repricing
    await this.repriceSeller(sellerId);
  }

  /**
   * Disable auto-repricer for a seller
   */
  static async disableAutoRepricer(sellerId: string): Promise<void> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      throw new Error('Seller not found');
    }

    const settings = seller.autoRepricerSettings as unknown as RepricerSettings;
    if (settings) {
      settings.enabled = false;
      seller.autoRepricerSettings = settings as any;
      await seller.save();
    }
  }

  /**
   * Update repricer rule for a specific listing
   */
  static async updateListingRule(
    sellerId: string,
    listingId: string,
    rule: RepricerRule
  ): Promise<void> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      throw new Error('Seller not found');
    }

    const settings = (seller.autoRepricerSettings as unknown as RepricerSettings) || {
      enabled: true,
      rules: {}
    };

    settings.rules[listingId] = rule;
    seller.autoRepricerSettings = settings as any;
    await seller.save();
  }

  /**
   * Get repricer settings for a seller
   */
  static async getRepricerSettings(sellerId: string): Promise<RepricerSettings | null> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      return null;
    }

    return (seller.autoRepricerSettings as unknown as RepricerSettings) || null;
  }

  /**
   * Background job: Reprice all sellers with auto-repricer enabled
   * Called every 15 minutes by BullMQ worker
   */
  static async repriceAllSellers(): Promise<{
    total: number;
    processed: number;
    totalRepriced: number;
    totalErrors: number;
  }> {
    const sellers = await SouqSeller.find({
      'autoRepricerSettings.enabled': true,
      status: 'active'
    });

    let processed = 0;
    let totalRepriced = 0;
    let totalErrors = 0;

    for (const seller of sellers) {
      try {
        const result = await this.repriceSeller(seller._id.toString());
        totalRepriced += result.repriced;
        totalErrors += result.errors;
        processed++;
      } catch (error) {
        console.error(`Failed to reprice seller ${seller._id}:`, error);
        totalErrors++;
      }
    }

    return {
      total: sellers.length,
      processed,
      totalRepriced,
      totalErrors
    };
  }

  /**
   * Get price history for a listing
   */
  static async getPriceHistory(
    listingId: string,
    days: number = 30
  ): Promise<Array<{ date: Date; price: number; reason: string }>> {
    // TODO: Implement price history tracking in a separate collection
    // For now, return empty array
    return [];
  }

  /**
   * Get competitor price analysis for a listing
   */
  static async getCompetitorAnalysis(fsin: string): Promise<{
    lowestPrice: number;
    highestPrice: number;
    averagePrice: number;
    medianPrice: number;
    totalOffers: number;
    priceDistribution: Array<{ range: string; count: number }>;
  }> {
    const offers = await BuyBoxService.getProductOffers(fsin);
    const prices = offers.map((offer: any) => offer.price).sort((a, b) => a - b);

    if (prices.length === 0) {
      return {
        lowestPrice: 0,
        highestPrice: 0,
        averagePrice: 0,
        medianPrice: 0,
        totalOffers: 0,
        priceDistribution: []
      };
    }

    const lowestPrice = prices[0];
    const highestPrice = prices[prices.length - 1];
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const medianPrice = prices[Math.floor(prices.length / 2)];

    // Calculate price distribution (buckets)
    const range = highestPrice - lowestPrice;
    const bucketSize = range / 5; // 5 buckets
    const priceDistribution = [];

    for (let i = 0; i < 5; i++) {
      const min = lowestPrice + (bucketSize * i);
      const max = lowestPrice + (bucketSize * (i + 1));
      const count = prices.filter(p => p >= min && p < max).length;
      priceDistribution.push({
        range: `${min.toFixed(2)} - ${max.toFixed(2)}`,
        count
      });
    }

    return {
      lowestPrice,
      highestPrice,
      averagePrice,
      medianPrice,
      totalOffers: offers.length,
      priceDistribution
    };
  }
}
