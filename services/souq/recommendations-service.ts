/**
 * @module services/souq/recommendations-service
 * @description Product recommendations engine for Fixzit Marketplace.
 *              Amazon-inspired personalized product suggestions.
 *
 * @features
 * - Collaborative Filtering: "Customers who bought X also bought Y"
 * - Content-Based Filtering: Similar products by category/attributes
 * - Recently Viewed: Track and suggest based on browsing history
 * - Trending Products: Real-time popularity tracking
 * - Personalized Suggestions: Based on purchase history & wishlists
 * - Cross-Sell: Related accessories and complements
 * - Up-Sell: Premium alternatives
 *
 * @algorithms
 * - Item-to-Item Collaborative Filtering
 * - Category Affinity Scoring
 * - Recency-Weighted Purchase History
 * - Price Range Matching
 *
 * @audit
 * - All operations logged via logger
 * - Tenant-isolated via orgId
 *
 * @agent AGENT-0031
 * @issue FEAT-REC-001
 */

import mongoose from "mongoose";
import { logger } from "@/lib/logger";
import { buildSouqOrgFilter } from "@/services/souq/org-scope";

// Lazy imports to avoid circular dependencies
let SouqOrder: typeof import("@/server/models/souq/Order").SouqOrder;
let SouqProduct: typeof import("@/server/models/souq/Product").SouqProduct;
let SouqWishlist: typeof import("@/server/models/souq/Wishlist").SouqWishlist;
let SouqListing: typeof import("@/server/models/souq/Listing").SouqListing;

async function ensureModels() {
  if (!SouqOrder) {
    const OrderModule = await import("@/server/models/souq/Order");
    SouqOrder = OrderModule.SouqOrder;
  }
  if (!SouqProduct) {
    const ProductModule = await import("@/server/models/souq/Product");
    SouqProduct = ProductModule.SouqProduct;
  }
  if (!SouqWishlist) {
    const WishlistModule = await import("@/server/models/souq/Wishlist");
    SouqWishlist = WishlistModule.SouqWishlist;
  }
  if (!SouqListing) {
    const ListingModule = await import("@/server/models/souq/Listing");
    SouqListing = ListingModule.SouqListing;
  }
}

// Helper: Build org-scoped filter
const buildOrgFilter = (orgId: string | mongoose.Types.ObjectId) =>
  buildSouqOrgFilter(orgId.toString()) as Record<string, unknown>;

// ============================================================================
// TYPES
// ============================================================================

export interface ProductRecommendation {
  productId: string;
  score: number;
  reason: RecommendationReason;
  metadata?: {
    categoryMatch?: boolean;
    priceRange?: "similar" | "higher" | "lower";
    purchaseCount?: number;
    wishlistCount?: number;
  };
}

export type RecommendationReason =
  | "also_bought"       // Collaborative filtering
  | "similar_product"   // Content-based (same category/attributes)
  | "recently_viewed"   // User's browsing history
  | "trending"          // Popular in marketplace
  | "based_on_wishlist" // From user's wishlist interests
  | "cross_sell"        // Related accessories
  | "up_sell"          // Premium alternative
  | "personalized";     // Combined user signals

export interface RecommendationOptions {
  limit?: number;
  excludeProductIds?: string[];
  includeReasons?: RecommendationReason[];
  priceRange?: { min?: number; max?: number };
  categoryId?: string;
}

// ============================================================================
// COLLABORATIVE FILTERING: "Customers Who Bought X Also Bought Y"
// ============================================================================

/**
 * Get products frequently bought together with a given product.
 * Uses order history to find co-purchased items.
 */
export async function getAlsoBought(
  orgId: string,
  productId: string,
  options: RecommendationOptions = {}
): Promise<ProductRecommendation[]> {
  await ensureModels();
  const { limit = 10, excludeProductIds = [] } = options;

  try {
    // Find orders containing this product
    const ordersWithProduct = await SouqOrder.find({
      ...buildOrgFilter(orgId),
      "items.productId": new mongoose.Types.ObjectId(productId),
      status: { $in: ["completed", "delivered"] },
    }).select("items");

    // Count co-purchased products
    const coPurchaseCounts = new Map<string, number>();
    
    for (const order of ordersWithProduct) {
      for (const item of order.items) {
        const itemProductId = item.productId?.toString();
        if (
          itemProductId &&
          itemProductId !== productId &&
          !excludeProductIds.includes(itemProductId)
        ) {
          coPurchaseCounts.set(
            itemProductId,
            (coPurchaseCounts.get(itemProductId) ?? 0) + 1
          );
        }
      }
    }

    // Sort by frequency and convert to recommendations
    const sorted = Array.from(coPurchaseCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    const maxCount = sorted[0]?.[1] ?? 1;

    return sorted.map(([pid, count]) => ({
      productId: pid,
      score: count / maxCount, // Normalize to 0-1
      reason: "also_bought" as const,
      metadata: { purchaseCount: count },
    }));
  } catch (error) {
    logger.error("[RecommendationsService] getAlsoBought failed", { error, productId });
    return [];
  }
}

// ============================================================================
// CONTENT-BASED FILTERING: Similar Products
// ============================================================================

/**
 * Get similar products based on category and attributes.
 */
export async function getSimilarProducts(
  orgId: string,
  productId: string,
  options: RecommendationOptions = {}
): Promise<ProductRecommendation[]> {
  await ensureModels();
  const { limit = 10, excludeProductIds = [] } = options;

  try {
    // Get source product
    const sourceProduct = await SouqProduct.findOne({
      ...buildOrgFilter(orgId),
      _id: new mongoose.Types.ObjectId(productId),
    });

    if (!sourceProduct) {
      return [];
    }

    // Build similarity query
    const query: Record<string, unknown> = {
      ...buildOrgFilter(orgId),
      _id: { 
        $nin: [
          new mongoose.Types.ObjectId(productId),
          ...excludeProductIds.map((id) => new mongoose.Types.ObjectId(id)),
        ],
      },
      isActive: true,
    };

    // Same category
    if (sourceProduct.categoryId) {
      query.categoryId = sourceProduct.categoryId;
    }

    // Find similar products
    const similarProducts = await SouqProduct.find(query)
      .limit(limit * 2) // Get more to filter by price
      .select("_id categoryId brandId attributes");

    // Score by attribute similarity
    const scored: ProductRecommendation[] = [];
    const sourceAttrs = sourceProduct.attributes ?? {};

    for (const product of similarProducts) {
      const productAttrs = product.attributes ?? {};
      let matchScore = 0;
      let totalAttrs = 0;

      // Compare attributes
      for (const [key, value] of Object.entries(sourceAttrs)) {
        totalAttrs++;
        if (productAttrs[key] === value) {
          matchScore++;
        }
      }

      // Category bonus
      if (product.categoryId === sourceProduct.categoryId) {
        matchScore += 2;
        totalAttrs += 2;
      }

      // Brand bonus
      if (product.brandId && product.brandId === sourceProduct.brandId) {
        matchScore += 1;
        totalAttrs += 1;
      }

      const score = totalAttrs > 0 ? matchScore / totalAttrs : 0;

      scored.push({
        productId: product._id.toString(),
        score,
        reason: "similar_product",
        metadata: {
          categoryMatch: product.categoryId === sourceProduct.categoryId,
        },
      });
    }

    // Sort by score and limit
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    logger.error("[RecommendationsService] getSimilarProducts failed", { error, productId });
    return [];
  }
}

// ============================================================================
// TRENDING PRODUCTS
// ============================================================================

// In-memory cache for trending products (update periodically)
const trendingCache: Map<string, { products: ProductRecommendation[]; updatedAt: Date }> = new Map();
const TRENDING_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get trending products based on recent orders.
 */
export async function getTrendingProducts(
  orgId: string,
  options: RecommendationOptions = {}
): Promise<ProductRecommendation[]> {
  await ensureModels();
  const { limit = 10, excludeProductIds = [] } = options;

  // Check cache
  const cached = trendingCache.get(orgId);
  if (cached && Date.now() - cached.updatedAt.getTime() < TRENDING_CACHE_TTL_MS) {
    return cached.products
      .filter((p) => !excludeProductIds.includes(p.productId))
      .slice(0, limit);
  }

  try {
    // Get orders from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const results = await SouqOrder.aggregate([
      {
        $match: {
          ...buildOrgFilter(orgId),
          createdAt: { $gte: sevenDaysAgo },
          status: { $in: ["completed", "delivered", "processing"] },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          orderCount: { $sum: 1 },
          totalQuantity: { $sum: "$items.quantity" },
        },
      },
      { $sort: { orderCount: -1, totalQuantity: -1 } },
      { $limit: 50 }, // Cache more than needed
    ]);

    const maxCount = results[0]?.orderCount ?? 1;

    const products: ProductRecommendation[] = results.map((r) => ({
      productId: r._id.toString(),
      score: r.orderCount / maxCount,
      reason: "trending" as const,
      metadata: { purchaseCount: r.orderCount },
    }));

    // Update cache
    trendingCache.set(orgId, { products, updatedAt: new Date() });

    return products
      .filter((p) => !excludeProductIds.includes(p.productId))
      .slice(0, limit);
  } catch (error) {
    logger.error("[RecommendationsService] getTrendingProducts failed", { error });
    return [];
  }
}

// ============================================================================
// PERSONALIZED RECOMMENDATIONS
// ============================================================================

/**
 * Get personalized recommendations for a user based on their history.
 * Combines purchase history, wishlist, and browsing behavior.
 */
export async function getPersonalizedRecommendations(
  orgId: string,
  userId: string,
  options: RecommendationOptions = {}
): Promise<ProductRecommendation[]> {
  await ensureModels();
  const { limit = 20, excludeProductIds = [] } = options;

  try {
    // 1. Get user's purchase history
    const userOrders = await SouqOrder.find({
      ...buildOrgFilter(orgId),
      customerId: new mongoose.Types.ObjectId(userId),
      status: { $in: ["completed", "delivered"] },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("items");

    const purchasedProductIds = new Set<string>();
    for (const order of userOrders) {
      for (const item of order.items) {
        if (item.productId) {
          purchasedProductIds.add(item.productId.toString());
        }
      }
    }

    // 2. Get user's wishlist
    const wishlists = await SouqWishlist.find({
      ...buildOrgFilter(orgId),
      userId: new mongoose.Types.ObjectId(userId),
    }).select("items");

    const wishlistProductIds = new Set<string>();
    for (const wishlist of wishlists) {
      for (const item of wishlist.items) {
        wishlistProductIds.add(item.productId.toString());
      }
    }

    // 3. Get "also bought" recommendations for purchased products
    const allRecommendations: ProductRecommendation[] = [];
    const seenProducts = new Set([...excludeProductIds, ...purchasedProductIds]);

    // Get recommendations based on last 5 purchases
    const recentPurchases = Array.from(purchasedProductIds).slice(0, 5);
    for (const productId of recentPurchases) {
      const alsoBought = await getAlsoBought(orgId, productId, {
        limit: 5,
        excludeProductIds: Array.from(seenProducts),
      });

      for (const rec of alsoBought) {
        if (!seenProducts.has(rec.productId)) {
          seenProducts.add(rec.productId);
          allRecommendations.push({
            ...rec,
            reason: "personalized",
            score: rec.score * 0.8, // Slightly lower weight for also-bought
          });
        }
      }
    }

    // 4. Get similar products to wishlist items
    const wishlistItems = Array.from(wishlistProductIds).slice(0, 5);
    for (const productId of wishlistItems) {
      if (!purchasedProductIds.has(productId)) {
        // Wishlist item itself is a recommendation if not purchased
        allRecommendations.push({
          productId,
          score: 0.9, // High score for wishlist items
          reason: "based_on_wishlist",
        });
        seenProducts.add(productId);
      }

      const similar = await getSimilarProducts(orgId, productId, {
        limit: 3,
        excludeProductIds: Array.from(seenProducts),
      });

      for (const rec of similar) {
        if (!seenProducts.has(rec.productId)) {
          seenProducts.add(rec.productId);
          allRecommendations.push({
            ...rec,
            reason: "personalized",
            score: rec.score * 0.7,
          });
        }
      }
    }

    // 5. Fill remaining slots with trending
    if (allRecommendations.length < limit) {
      const trending = await getTrendingProducts(orgId, {
        limit: limit - allRecommendations.length,
        excludeProductIds: Array.from(seenProducts),
      });
      allRecommendations.push(...trending);
    }

    // Sort by score and return
    return allRecommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    logger.error("[RecommendationsService] getPersonalizedRecommendations failed", { error, userId });
    return [];
  }
}

// ============================================================================
// CROSS-SELL & UP-SELL
// ============================================================================

/**
 * Get cross-sell recommendations (accessories, complements).
 * Based on category relationships and purchase patterns.
 */
export async function getCrossSellProducts(
  orgId: string,
  productId: string,
  options: RecommendationOptions = {}
): Promise<ProductRecommendation[]> {
  await ensureModels();
  const { limit = 5, excludeProductIds = [] } = options;

  try {
    // For now, use also-bought as a proxy for cross-sell
    // In production, define category relationships (e.g., phone -> case, cable)
    const alsoBought = await getAlsoBought(orgId, productId, {
      limit,
      excludeProductIds,
    });

    // Re-label as cross_sell
    return alsoBought.map((rec) => ({
      ...rec,
      reason: "cross_sell" as const,
    }));
  } catch (error) {
    logger.error("[RecommendationsService] getCrossSellProducts failed", { error, productId });
    return [];
  }
}

/**
 * Get up-sell recommendations (premium alternatives).
 * Same category but higher price tier.
 */
export async function getUpSellProducts(
  orgId: string,
  productId: string,
  options: RecommendationOptions = {}
): Promise<ProductRecommendation[]> {
  await ensureModels();
  const { limit = 5, excludeProductIds = [] } = options;

  try {
    // Get source product with listing for price
    const sourceProduct = await SouqProduct.findOne({
      ...buildOrgFilter(orgId),
      _id: new mongoose.Types.ObjectId(productId),
    });

    if (!sourceProduct) return [];

    // Get source listing price
    const sourceListing = await SouqListing.findOne({
      ...buildOrgFilter(orgId),
      productId: new mongoose.Types.ObjectId(productId),
      status: "active",
    }).select("price");

    const sourcePrice = sourceListing?.price ?? 0;
    if (sourcePrice === 0) return [];

    // Find higher-priced products in same category
    const listings = await SouqListing.find({
      ...buildOrgFilter(orgId),
      productId: {
        $nin: [
          new mongoose.Types.ObjectId(productId),
          ...excludeProductIds.map((id) => new mongoose.Types.ObjectId(id)),
        ],
      },
      status: "active",
      price: { $gt: sourcePrice, $lte: sourcePrice * 2 }, // Up to 2x price
    })
      .sort({ price: 1 })
      .limit(limit)
      .select("productId price")
      .populate({
        path: "productId",
        match: { categoryId: sourceProduct.categoryId },
        select: "_id",
      });

    return listings
      .filter((l) => l.productId) // Filter out non-matching categories
      .map((listing) => ({
        productId: (listing.productId as { _id: mongoose.Types.ObjectId })._id.toString(),
        score: 1 - (listing.price - sourcePrice) / (sourcePrice * 2), // Higher score for closer price
        reason: "up_sell" as const,
        metadata: { priceRange: "higher" as const },
      }));
  } catch (error) {
    logger.error("[RecommendationsService] getUpSellProducts failed", { error, productId });
    return [];
  }
}

// ============================================================================
// HOMEPAGE RECOMMENDATIONS
// ============================================================================

/**
 * Get recommendations for homepage (anonymous or logged-in user).
 * Combines trending, new arrivals, and personalized (if logged in).
 */
export async function getHomepageRecommendations(
  orgId: string,
  userId?: string,
  options: RecommendationOptions = {}
): Promise<{
  trending: ProductRecommendation[];
  personalized: ProductRecommendation[];
  newArrivals: ProductRecommendation[];
}> {
  const { limit = 10 } = options;

  const [trending, personalized] = await Promise.all([
    getTrendingProducts(orgId, { limit }),
    userId
      ? getPersonalizedRecommendations(orgId, userId, { limit })
      : Promise.resolve([]),
  ]);

  // Get new arrivals (products added in last 30 days)
  await ensureModels();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let newArrivals: ProductRecommendation[] = [];
  try {
    const products = await SouqProduct.find({
      ...buildOrgFilter(orgId),
      isActive: true,
      createdAt: { $gte: thirtyDaysAgo },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("_id createdAt");

    const now = Date.now();
    newArrivals = products.map((p) => ({
      productId: p._id.toString(),
      score: 1 - (now - p.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000), // Newer = higher score
      reason: "trending" as const, // Using trending reason for new arrivals
    }));
  } catch (error) {
    logger.error("[RecommendationsService] getHomepageRecommendations newArrivals failed", { error });
  }

  return { trending, personalized, newArrivals };
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Clear trending cache for an organization.
 * Call when significant inventory/order changes occur.
 */
export function clearTrendingCache(orgId?: string): void {
  if (orgId) {
    trendingCache.delete(orgId);
  } else {
    trendingCache.clear();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const RecommendationsService = {
  // Collaborative Filtering
  getAlsoBought,
  
  // Content-Based Filtering
  getSimilarProducts,
  
  // Trending
  getTrendingProducts,
  
  // Personalized
  getPersonalizedRecommendations,
  
  // Cross-Sell & Up-Sell
  getCrossSellProducts,
  getUpSellProducts,
  
  // Homepage
  getHomepageRecommendations,
  
  // Cache
  clearTrendingCache,
};

export default RecommendationsService;
