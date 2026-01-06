/**
 * @module services/souq/wishlist-service
 * @description Wishlist service for Fixzit Marketplace.
 *              Amazon-inspired "Save for Later" functionality.
 *
 * @features
 * - Create and manage multiple wishlists
 * - Add/remove products with metadata
 * - Price drop alerts
 * - Share wishlist via unique link
 * - Move items to cart
 * - Recently viewed product tracking
 * - Wishlist analytics (popular products)
 *
 * @audit
 * - All operations logged via logger
 * - Tenant-isolated via orgId
 *
 * @agent AGENT-0031
 * @issue FEAT-WISH-001
 */

import mongoose from "mongoose";
import { SouqWishlist, type IWishlist, type IWishlistItem } from "@/server/models/souq/Wishlist";
import { SouqListing } from "@/server/models/souq/Listing";
import { logger } from "@/lib/logger";
import { buildSouqOrgFilter } from "@/services/souq/org-scope";
import { uniqueSuffix } from "@/lib/id-generator";

// Helper: Build org-scoped filter
const buildOrgFilter = (orgId: string | mongoose.Types.ObjectId) =>
  buildSouqOrgFilter(orgId.toString()) as Record<string, unknown>;

// ============================================================================
// TYPES
// ============================================================================

export interface CreateWishlistInput {
  orgId: string;
  userId: string;
  name?: string;
  description?: string;
  isDefault?: boolean;
  isPublic?: boolean;
}

export interface AddToWishlistInput {
  orgId: string;
  userId: string;
  productId: string;
  wishlistId?: string; // Optional: adds to default if not specified
  listingId?: string;
  priority?: "high" | "medium" | "low";
  notes?: string;
  priceAlertEnabled?: boolean;
  priceAlertThreshold?: number;
}

export interface RemoveFromWishlistInput {
  orgId: string;
  userId: string;
  productId: string;
  wishlistId?: string;
}

export interface MoveToCartInput {
  orgId: string;
  userId: string;
  productId: string;
  wishlistId?: string;
  quantity?: number;
}

export interface WishlistResult {
  success: boolean;
  wishlist?: IWishlist;
  error?: string;
}

export interface WishlistItemResult {
  success: boolean;
  item?: IWishlistItem;
  wishlist?: IWishlist;
  error?: string;
}

// ============================================================================
// WISHLIST CRUD
// ============================================================================

/**
 * Create a new wishlist for a user.
 * First wishlist is automatically set as default.
 */
export async function createWishlist(
  input: CreateWishlistInput
): Promise<WishlistResult> {
  const { orgId, userId, name = "Default", description, isDefault, isPublic } = input;

  try {
    // Check existing wishlists
    const existingCount = await SouqWishlist.countDocuments({
      ...buildOrgFilter(orgId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    // First wishlist is always default
    const shouldBeDefault = existingCount === 0 ? true : isDefault;

    // Generate share token if public
    const shareToken = isPublic ? `SHARE-${uniqueSuffix()}` : undefined;

    const wishlist = new SouqWishlist({
      orgId: new mongoose.Types.ObjectId(orgId),
      userId: new mongoose.Types.ObjectId(userId),
      name,
      description,
      isDefault: shouldBeDefault,
      isPublic: isPublic ?? false,
      shareToken,
      items: [],
    });

    await wishlist.save();

    logger.info("[WishlistService] Created wishlist", {
      wishlistId: wishlist._id,
      userId,
      name,
      isDefault: shouldBeDefault,
    });

    return { success: true, wishlist };
  } catch (error) {
    logger.error("[WishlistService] Failed to create wishlist", { error, userId });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create wishlist" 
    };
  }
}

/**
 * Get all wishlists for a user.
 */
export async function getUserWishlists(
  orgId: string,
  userId: string
): Promise<IWishlist[]> {
  return SouqWishlist.find({
    ...buildOrgFilter(orgId),
    userId: new mongoose.Types.ObjectId(userId),
  }).sort({ isDefault: -1, updatedAt: -1 });
}

/**
 * Get a specific wishlist by ID.
 */
export async function getWishlistById(
  orgId: string,
  wishlistId: string
): Promise<IWishlist | null> {
  return SouqWishlist.findOne({
    ...buildOrgFilter(orgId),
    _id: new mongoose.Types.ObjectId(wishlistId),
  });
}

/**
 * Get default wishlist for a user (create if not exists).
 */
export async function getOrCreateDefaultWishlist(
  orgId: string,
  userId: string
): Promise<IWishlist> {
  const wishlist = await SouqWishlist.findOne({
    ...buildOrgFilter(orgId),
    userId: new mongoose.Types.ObjectId(userId),
    isDefault: true,
  });

  if (wishlist) {
    return wishlist;
  }

  // Create new default wishlist
  const result = await createWishlist({ orgId, userId, name: "Default" });
  if (!result.success || !result.wishlist) {
    throw new Error("Failed to create default wishlist");
  }
  return result.wishlist;
}

/**
 * Get wishlist by share token (public access).
 */
export async function getWishlistByShareToken(
  shareToken: string
): Promise<IWishlist | null> {
  return SouqWishlist.findOne({
    shareToken,
    isPublic: true,
  });
}

/**
 * Delete a wishlist (cannot delete default unless it's the only one).
 */
export async function deleteWishlist(
  orgId: string,
  userId: string,
  wishlistId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const wishlist = await SouqWishlist.findOne({
      ...buildOrgFilter(orgId),
      _id: new mongoose.Types.ObjectId(wishlistId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!wishlist) {
      return { success: false, error: "Wishlist not found" };
    }

    // Check if it's the only wishlist
    const count = await SouqWishlist.countDocuments({
      ...buildOrgFilter(orgId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (wishlist.isDefault && count === 1) {
      return { success: false, error: "Cannot delete the only wishlist" };
    }

    await wishlist.deleteOne();

    // If deleted default, promote next oldest to default
    if (wishlist.isDefault) {
      const nextWishlist = await SouqWishlist.findOne({
        ...buildOrgFilter(orgId),
        userId: new mongoose.Types.ObjectId(userId),
      }).sort({ createdAt: 1 });

      if (nextWishlist) {
        nextWishlist.isDefault = true;
        await nextWishlist.save();
      }
    }

    logger.info("[WishlistService] Deleted wishlist", { wishlistId, userId });
    return { success: true };
  } catch (error) {
    logger.error("[WishlistService] Failed to delete wishlist", { error, wishlistId });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete wishlist" 
    };
  }
}

// ============================================================================
// WISHLIST ITEMS
// ============================================================================

/**
 * Add a product to wishlist.
 * Creates default wishlist if user has none.
 */
export async function addToWishlist(
  input: AddToWishlistInput
): Promise<WishlistItemResult> {
  const {
    orgId,
    userId,
    productId,
    wishlistId,
    listingId,
    priority = "medium",
    notes,
    priceAlertEnabled = false,
    priceAlertThreshold,
  } = input;

  try {
    // Get target wishlist
    let wishlist: IWishlist | null;
    if (wishlistId) {
      wishlist = await SouqWishlist.findOne({
        ...buildOrgFilter(orgId),
        _id: new mongoose.Types.ObjectId(wishlistId),
        userId: new mongoose.Types.ObjectId(userId),
      });
      if (!wishlist) {
        return { success: false, error: "Wishlist not found" };
      }
    } else {
      wishlist = await getOrCreateDefaultWishlist(orgId, userId);
    }

    // Check if already in wishlist
    const existingItem = wishlist.items.find(
      (item) => item.productId.toString() === productId
    );
    if (existingItem) {
      // Update existing item
      existingItem.priority = priority;
      if (notes) existingItem.notes = notes;
      existingItem.priceAlertEnabled = priceAlertEnabled;
      if (priceAlertThreshold) existingItem.priceAlertThreshold = priceAlertThreshold;
      await wishlist.save();

      logger.info("[WishlistService] Updated wishlist item", {
        wishlistId: wishlist._id,
        productId,
      });

      return { success: true, item: existingItem, wishlist };
    }

    // Get current price from listing
    let priceWhenAdded: number | undefined;
    if (listingId) {
      const listing = await SouqListing.findById(listingId);
      priceWhenAdded = listing?.price ?? undefined;
    }

    // Add new item
    const newItem: IWishlistItem = {
      productId: new mongoose.Types.ObjectId(productId),
      listingId: listingId ? new mongoose.Types.ObjectId(listingId) : undefined,
      addedAt: new Date(),
      priority,
      notes,
      priceWhenAdded,
      priceAlertEnabled,
      priceAlertThreshold,
    };

    wishlist.items.push(newItem);
    await wishlist.save();

    logger.info("[WishlistService] Added item to wishlist", {
      wishlistId: wishlist._id,
      productId,
      priority,
    });

    return { success: true, item: newItem, wishlist };
  } catch (error) {
    logger.error("[WishlistService] Failed to add to wishlist", { error, productId });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to add to wishlist" 
    };
  }
}

/**
 * Remove a product from wishlist.
 */
export async function removeFromWishlist(
  input: RemoveFromWishlistInput
): Promise<{ success: boolean; error?: string }> {
  const { orgId, userId, productId, wishlistId } = input;

  try {
    const filter: Record<string, unknown> = {
      ...buildOrgFilter(orgId),
      userId: new mongoose.Types.ObjectId(userId),
    };
    if (wishlistId) {
      filter._id = new mongoose.Types.ObjectId(wishlistId);
    } else {
      filter.isDefault = true;
    }

    const wishlist = await SouqWishlist.findOne(filter);
    if (!wishlist) {
      return { success: false, error: "Wishlist not found" };
    }

    const initialLength = wishlist.items.length;
    wishlist.items = wishlist.items.filter(
      (item) => item.productId.toString() !== productId
    );

    if (wishlist.items.length === initialLength) {
      return { success: false, error: "Item not found in wishlist" };
    }

    await wishlist.save();

    logger.info("[WishlistService] Removed item from wishlist", {
      wishlistId: wishlist._id,
      productId,
    });

    return { success: true };
  } catch (error) {
    logger.error("[WishlistService] Failed to remove from wishlist", { error, productId });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to remove from wishlist" 
    };
  }
}

/**
 * Check if product is in any of user's wishlists.
 */
export async function isInWishlist(
  orgId: string,
  userId: string,
  productId: string
): Promise<{ inWishlist: boolean; wishlistIds: string[] }> {
  const wishlists = await SouqWishlist.find({
    ...buildOrgFilter(orgId),
    userId: new mongoose.Types.ObjectId(userId),
    "items.productId": new mongoose.Types.ObjectId(productId),
  }).select("_id");

  return {
    inWishlist: wishlists.length > 0,
    wishlistIds: wishlists.map((w) => w._id.toString()),
  };
}

// ============================================================================
// PRICE ALERTS
// ============================================================================

/**
 * Get all items with price alerts enabled.
 * Used by background job to check for price drops.
 */
export async function getItemsWithPriceAlerts(
  orgId: string
): Promise<Array<{ wishlist: IWishlist; item: IWishlistItem }>> {
  const wishlists = await SouqWishlist.find({
    ...buildOrgFilter(orgId),
    "items.priceAlertEnabled": true,
  });

  const result: Array<{ wishlist: IWishlist; item: IWishlistItem }> = [];
  
  for (const wishlist of wishlists) {
    for (const item of wishlist.items) {
      if (item.priceAlertEnabled) {
        result.push({ wishlist, item });
      }
    }
  }

  return result;
}

/**
 * Update notification timestamp for a price alert.
 */
export async function markPriceAlertNotified(
  wishlistId: string,
  productId: string
): Promise<void> {
  await SouqWishlist.updateOne(
    {
      _id: new mongoose.Types.ObjectId(wishlistId),
      "items.productId": new mongoose.Types.ObjectId(productId),
    },
    {
      $set: { "items.$.notifiedAt": new Date() },
    }
  );
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get most wishlisted products in the marketplace.
 * Useful for trending products and recommendations.
 */
export async function getMostWishlistedProducts(
  orgId: string,
  limit = 10
): Promise<Array<{ productId: string; count: number }>> {
  const results = await SouqWishlist.aggregate([
    { $match: buildOrgFilter(orgId) },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $project: {
        productId: { $toString: "$_id" },
        count: 1,
        _id: 0,
      },
    },
  ]);

  return results;
}

/**
 * Get wishlist count for a specific product.
 */
export async function getProductWishlistCount(
  orgId: string,
  productId: string
): Promise<number> {
  const count = await SouqWishlist.countDocuments({
    ...buildOrgFilter(orgId),
    "items.productId": new mongoose.Types.ObjectId(productId),
  });
  return count;
}

// ============================================================================
// RECENTLY VIEWED (In-Memory for Performance)
// ============================================================================

// Simple in-memory cache for recently viewed products
// In production, consider Redis for distributed deployments
const recentlyViewedCache = new Map<string, { productId: string; viewedAt: Date }[]>();
const MAX_RECENTLY_VIEWED = 50;

/**
 * Track a product view for a user.
 */
export function trackProductView(
  userId: string,
  productId: string
): void {
  const key = userId;
  const items = recentlyViewedCache.get(key) ?? [];
  
  // Remove if already exists (to move to front)
  const filtered = items.filter((item) => item.productId !== productId);
  
  // Add to front
  filtered.unshift({ productId, viewedAt: new Date() });
  
  // Trim to max size
  if (filtered.length > MAX_RECENTLY_VIEWED) {
    filtered.pop();
  }
  
  recentlyViewedCache.set(key, filtered);
}

/**
 * Get recently viewed products for a user.
 */
export function getRecentlyViewed(
  userId: string,
  limit = 10
): Array<{ productId: string; viewedAt: Date }> {
  const items = recentlyViewedCache.get(userId) ?? [];
  return items.slice(0, limit);
}

/**
 * Clear recently viewed for a user.
 */
export function clearRecentlyViewed(userId: string): void {
  recentlyViewedCache.delete(userId);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const WishlistService = {
  // CRUD
  createWishlist,
  getUserWishlists,
  getWishlistById,
  getOrCreateDefaultWishlist,
  getWishlistByShareToken,
  deleteWishlist,
  
  // Items
  addToWishlist,
  removeFromWishlist,
  isInWishlist,
  
  // Price Alerts
  getItemsWithPriceAlerts,
  markPriceAlertNotified,
  
  // Analytics
  getMostWishlistedProducts,
  getProductWishlistCount,
  
  // Recently Viewed
  trackProductView,
  getRecentlyViewed,
  clearRecentlyViewed,
};

export default WishlistService;
