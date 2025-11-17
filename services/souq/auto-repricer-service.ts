/**
 * Auto-Repricer Service - Automatically adjusts seller prices to win Buy Box
 * @module services/souq/auto-repricer-service
 */

import { SouqListing } from '@/server/models/souq/Listing';
import { SouqSeller } from '@/server/models/souq/Seller';
import { BuyBoxService } from './buybox-service';
import { addJob, QUEUE_NAMES } from '@/lib/queues/setup';
import { logger } from '@/lib/logger';

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

type OfferIdentifier = {
  id: string;
  price: number;
};

const TARGET_POSITIONS = new Set<RepricerRule['targetPosition']>(['win', 'competitive']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeListingId(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (!isPlainObject(value)) {
    return null;
  }

  if (typeof value.id === 'string' && value.id.length > 0) {
    return value.id;
  }

  const rawId = value._id;
  if (typeof rawId === 'string' && rawId.length > 0) {
    return rawId;
  }
  if (isPlainObject(rawId) && typeof rawId.toString === 'function') {
    return rawId.toString();
  }

  return null;
}

function toOfferIdentifier(value: unknown): OfferIdentifier | null {
  if (!isPlainObject(value)) {
    return null;
  }
  const id = normalizeListingId(value);
  const priceValue = value.price;
  if (id && typeof priceValue === 'number' && Number.isFinite(priceValue)) {
    return { id, price: priceValue };
  }
  return null;
}

function isRepricerRule(value: unknown): value is RepricerRule {
  if (!isPlainObject(value)) {
    return false;
  }
  const candidate = value as Partial<RepricerRule>;
  return (
    typeof candidate.enabled === 'boolean' &&
    typeof candidate.minPrice === 'number' &&
    typeof candidate.maxPrice === 'number' &&
    typeof candidate.undercut === 'number' &&
    typeof candidate.protectMargin === 'boolean' &&
    typeof candidate.targetPosition === 'string' &&
    TARGET_POSITIONS.has(candidate.targetPosition as RepricerRule['targetPosition'])
  );
}

function isRepricerSettings(value: unknown): value is RepricerSettings {
  if (!isPlainObject(value)) {
    return false;
  }
  const candidate = value as Partial<RepricerSettings>;
  if (typeof candidate.enabled !== 'boolean') {
    return false;
  }
  if (!candidate.rules || !isPlainObject(candidate.rules)) {
    return false;
  }
  const rulesRecord = candidate.rules as Record<string, unknown>;
  if (!Object.values(rulesRecord).every(isRepricerRule)) {
    return false;
  }
  if (candidate.defaultRule && !isRepricerRule(candidate.defaultRule)) {
    return false;
  }
  return true;
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
    const rawSettings = seller.autoRepricerSettings;
    if (!isRepricerSettings(rawSettings) || !rawSettings.enabled) {
      if (rawSettings && !isRepricerSettings(rawSettings)) {
        logger.warn('[AutoRepricer] Seller has invalid settings; skipping', { sellerId });
      }
      return { repriced: 0, errors: 0, listings: [] };
    }
    const settings = rawSettings;

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
        const rule = this.resolveRule(settings, listing._id.toString(), listing.fsin);

        if (!rule?.enabled) {
          continue;
        }

        // Get current Buy Box winner
        const rawWinner = await BuyBoxService.calculateBuyBoxWinner(listing.fsin);
        const winner = toOfferIdentifier(rawWinner);
        
        // Get all competing offers
        const rawOffers = await BuyBoxService.getProductOffers(listing.fsin, {
          condition: listing.condition
        });
        const offers = Array.isArray(rawOffers) ? this.normalizeOffers(rawOffers) : [];

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

          // Track price history
          const PriceHistory = (await import('@/server/models/souq/PriceHistory')).default;
          const change = newPrice - oldPrice;
          const changePercent = (change / oldPrice) * 100;
          
          // Calculate 7-day average sales before change
          const SouqOrder = (await import('@/server/models/souq/Order')).default;
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          const recentOrders = await SouqOrder.countDocuments({
            listingId: listing._id.toString(),
            createdAt: { $gte: sevenDaysAgo },
            status: { $in: ['completed', 'shipped', 'delivered'] }
          });
          
          await PriceHistory.create({
            listingId: listing._id.toString(),
            sellerId,
            productId: listing.fsin,
            oldPrice,
            newPrice,
            change,
            changePercent,
            reason: 'auto_repricer',
            competitorPrice: offers[0]?.price,
            competitorListingId: offers[0]?._id?.toString(),
            autoRepricerRule: `${rule.targetPosition}-${rule.undercut}`,
            salesBefore: recentOrders / 7, // Average per day
            createdAt: new Date()
          });

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
        logger.error('[AutoRepricer] Failed to reprice listing', error, {
          sellerId,
          listingId: listing._id.toString()
        });
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
    winner: OfferIdentifier | null,
    offers: OfferIdentifier[],
    rule: RepricerRule,
    currentListingId: string
  ): number {
    // If we're already the winner and target is 'competitive', no need to change
    if (winner && winner.id === currentListingId && rule.targetPosition === 'competitive') {
      return currentPrice;
    }

    // Find lowest competing price (excluding our own listing)
    const competingPrices = offers
      .filter(offer => offer.id !== currentListingId)
      .map(offer => offer.price)
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

    if (!isRepricerSettings(settings)) {
      throw new Error('Invalid repricer settings payload');
    }

    seller.autoRepricerSettings = settings;
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

    const settings = isRepricerSettings(seller.autoRepricerSettings)
      ? seller.autoRepricerSettings
      : null;

    if (settings) {
      settings.enabled = false;
      seller.autoRepricerSettings = settings;
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

    const settings = isRepricerSettings(seller.autoRepricerSettings)
      ? seller.autoRepricerSettings
      : {
          enabled: true,
          rules: {}
        };

    settings.rules[listingId] = rule;
    seller.autoRepricerSettings = settings;
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

    return isRepricerSettings(seller.autoRepricerSettings)
      ? seller.autoRepricerSettings
      : null;
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
        logger.error('[AutoRepricer] Failed to reprice seller', error, {
          sellerId: seller._id.toString()
        });
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
    const PriceHistory = (await import('@/server/models/souq/PriceHistory')).default;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const history = await PriceHistory.find({
      listingId,
      createdAt: { $gte: startDate }
    })
      .sort({ createdAt: 1 })
      .select({ createdAt: 1, newPrice: 1, reason: 1 })
      .lean<{ createdAt: Date; newPrice: number; reason: string }>();
    
    return history.map(entry => ({
      date: entry.createdAt,
      price: entry.newPrice,
      reason: entry.reason
    }));
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
    const rawOffers = await BuyBoxService.getProductOffers(fsin);
    const offers = Array.isArray(rawOffers) ? this.normalizeOffers(rawOffers) : [];
    const prices = offers.map(offer => offer.price).sort((a, b) => a - b);

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
      totalOffers: prices.length,
      priceDistribution
    };
  }

  private static resolveRule(
    settings: RepricerSettings,
    listingId: string,
    fsin: string
  ): RepricerRule | null {
    const rules = settings.rules || {};
    return rules[listingId] || rules[fsin] || settings.defaultRule || null;
  }

  private static normalizeOffers(rawOffers: unknown[]): OfferIdentifier[] {
    return rawOffers
      .map(toOfferIdentifier)
      .filter((offer): offer is OfferIdentifier => offer !== null);
  }
}
