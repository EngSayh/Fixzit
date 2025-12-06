import {
  searchClient,
  INDEXES,
  ProductDocument,
  SellerDocument,
} from "@/lib/meilisearch";
import { logger } from "@/lib/logger";
import type { Filter } from "mongodb";
import { ObjectId as MongoObjectId } from "mongodb";
import { withMeiliResilience } from "@/lib/meilisearch-resilience";

/**
 * Search Indexer Service
 *
 * Manages Meilisearch index synchronization:
 * - Full reindex: Daily batch upload (2 AM)
 * - Incremental updates: Real-time sync on listing changes
 * - Deletion: Remove from index when listing deleted
 *
 * Architecture:
 * - Batch size: 1000 documents per upload
 * - Indexing strategy: Hybrid (full + incremental)
 * - Error handling: Retry failed batches, log failures
 */

const BATCH_SIZE = 1000;

// Temporary type definitions (replace with actual types once souq types are defined)
interface SouqListing {
  listingId: string;
  productId: string;
  sellerId: string;
  orgId: string; // Required for tenant isolation
  price: number;
  quantity: number;
  status: string;
  fulfillmentMethod: string;
  shippingOption: string;
  createdAt: string;
}

interface SouqProduct {
  fsin: string;
  title: string;
  description: string;
  brand: string;
  category: string;
  subcategory?: string;
  rating: number;
  totalReviews: number;
  images: string[];
  badges: string[];
}

interface SouqSeller {
  sellerId: string;
  orgId: string; // Required for tenant isolation
  tradeName: string;
  legalName?: string;
  accountHealth: {
    overall: number;
    onTimeShippingRate: number;
    odr: number;
  };
  ratings: {
    overall: number;
    totalOrders: number;
  };
  badges: string[];
  status: string;
  createdAt: string;
}

export class SearchIndexerService {
  static readonly BATCH_SIZE = BATCH_SIZE;

  /**
   * Full reindex of all products for a specific organization
   * Run daily at 2 AM via BullMQ cron job
   * 🔐 STRICT v4.1: orgId is REQUIRED to prevent cross-tenant data exposure
   */
  static async fullReindexProducts(options: {
    orgId: string; // Required for tenant isolation (STRICT v4.1)
  }): Promise<{
    indexed: number;
    errors: number;
  }> {
    if (!options.orgId) {
      throw new Error('orgId is required for fullReindexProducts (STRICT v4.1 tenant isolation)');
    }

    logger.info(`[SearchIndexer] Starting full product reindex for org: ${options.orgId}...`, {
      component: "SearchIndexerService",
      action: "fullReindexProducts",
      orgId: options.orgId,
    });

    let indexed = 0;
    let errors = 0;
    let offset = 0;

    try {
      const index = searchClient.index(INDEXES.PRODUCTS);

      // 🔐 STRICT v4.1: Tenant-safe deletion - only delete docs for THIS org
      await withMeiliResilience("products-clear-org", "index", () =>
        index.deleteDocuments({ filter: `orgId = "${options.orgId}"` }),
      );
      logger.info(`[SearchIndexer] Cleared product index for org: ${options.orgId}`);

      // Fetch all active listings in batches for this org
      while (true) {
        const listings = await this.fetchActiveListings(
          offset,
          BATCH_SIZE,
          options.orgId, // Required for tenant isolation
        );
        if (listings.length === 0) break;

        // Transform to search documents
        const documents = await this.transformListingsToDocuments(listings);

        // Upload batch to Meilisearch
        try {
          await withMeiliResilience("products-batch-index", "index", () =>
            index.addDocuments(documents),
          );
          indexed += documents.length;
          logger.info(`[SearchIndexer] Indexed batch: ${indexed} products`);
        } catch (_error) {
          const error =
            _error instanceof Error ? _error : new Error(String(_error));
          void error;
          logger.error("[SearchIndexer] Failed to index batch", error, {
            component: "SearchIndexerService",
            action: "fullReindexProducts",
            offset,
          });
          errors += documents.length;
        }

        // Next batch
        offset += BATCH_SIZE;

        // Break if we got fewer results than requested (last page)
        if (listings.length < BATCH_SIZE) break;
      }

      logger.info(
        `[SearchIndexer] Full reindex complete: ${indexed} products indexed, ${errors} errors`,
      );

      return { indexed, errors };
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("[SearchIndexer] Full reindex failed", error, {
        component: "SearchIndexerService",
        action: "fullReindexProducts",
      });
      throw error;
    }
  }

  /**
   * Incremental update: Sync single listing
   * Triggered on listing create/update
   */
  static async updateListing(
    listingId: string,
    options: { orgId: string },
  ): Promise<void> {
    try {
      const listing = await this.fetchListingById(listingId, options.orgId);
      if (!listing) {
        logger.warn(`[SearchIndexer] Listing not found: ${listingId}`, {
          component: "SearchIndexerService",
          action: "updateListing",
          listingId,
          orgId: options.orgId,
        });
        return;
      }

      // Skip if not active
      if (listing.status !== "active") {
        await this.deleteFromIndex(listing.productId, {
          orgId: options.orgId,
        });
        return;
      }

      const documents = await this.transformListingsToDocuments([listing]);

      const index = searchClient.index(INDEXES.PRODUCTS);
      await withMeiliResilience("product-update", "index", () =>
        index.addDocuments(documents),
      );

      logger.info(`[SearchIndexer] Updated listing in search: ${listingId}`, {
        component: "SearchIndexerService",
        action: "updateListing",
        listingId,
        orgId: options.orgId,
      });
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error(
        `[SearchIndexer] Failed to update listing ${listingId}`,
        error,
        {
          component: "SearchIndexerService",
          action: "updateListing",
          listingId,
          orgId: options.orgId,
        },
      );
      throw error;
    }
  }

  /**
   * Remove product from index
   * Triggered on listing deletion or deactivation
   * Uses composite id (orgId_fsin) for tenant-safe deletion (STRICT v4.1)
   */
  static async deleteFromIndex(
    fsin: string,
    options: { orgId: string },
  ): Promise<void> {
    try {
      if (!options.orgId) {
        logger.error("[SearchIndexer] Cannot delete without orgId - tenant isolation required", {
          component: "SearchIndexerService",
          action: "deleteFromIndex",
          fsin,
        });
        throw new Error("orgId is required for deleteFromIndex (STRICT v4.1 tenant isolation)");
      }

      // Use composite id for tenant-safe deletion
      const compositeId = `${options.orgId}_${fsin}`;
      const index = searchClient.index(INDEXES.PRODUCTS);
      await withMeiliResilience("product-delete", "index", () =>
        index.deleteDocument(compositeId),
      );

      logger.info(`[SearchIndexer] Deleted product from search: ${fsin}`, {
        component: "SearchIndexerService",
        action: "deleteFromIndex",
        fsin,
        compositeId,
        orgId: options.orgId,
      });
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error(`[SearchIndexer] Failed to delete product ${fsin}`, error, {
        component: "SearchIndexerService",
        action: "deleteFromIndex",
        fsin,
        orgId: options.orgId,
      });
      throw error;
    }
  }

  /**
   * Full reindex of all sellers for a specific organization
   * 🔐 STRICT v4.1: orgId is REQUIRED to prevent cross-tenant data exposure
   */
  static async fullReindexSellers(options: {
    orgId: string; // Required for tenant isolation (STRICT v4.1)
  }): Promise<{
    indexed: number;
    errors: number;
  }> {
    if (!options.orgId) {
      throw new Error('orgId is required for fullReindexSellers (STRICT v4.1 tenant isolation)');
    }

    logger.info(`[SearchIndexer] Starting full seller reindex for org: ${options.orgId}...`, {
      component: "SearchIndexerService",
      action: "fullReindexSellers",
      orgId: options.orgId,
    });

    let indexed = 0;
    let errors = 0;
    let offset = 0;

    try {
      const index = searchClient.index(INDEXES.SELLERS);

      // 🔐 STRICT v4.1: Tenant-safe deletion - only delete docs for THIS org
      await withMeiliResilience("sellers-clear-org", "index", () =>
        index.deleteDocuments({ filter: `orgId = "${options.orgId}"` }),
      );
      logger.info(`[SearchIndexer] Cleared seller index for org: ${options.orgId}`);

      // Fetch all active sellers in batches for this org
      while (true) {
        const sellers = await this.fetchActiveSellers(
          offset,
          BATCH_SIZE,
          options.orgId, // Required for tenant isolation
        );
        if (sellers.length === 0) break;

        // Transform to search documents
        const documents = this.transformSellersToDocuments(sellers);

        // Upload batch to Meilisearch
        try {
          await withMeiliResilience("sellers-batch-index", "index", () =>
            index.addDocuments(documents),
          );
          indexed += documents.length;
          logger.info(`[SearchIndexer] Indexed batch: ${indexed} sellers`);
        } catch (_error) {
          const error =
            _error instanceof Error ? _error : new Error(String(_error));
          void error;
          logger.error("[SearchIndexer] Failed to index seller batch", error, {
            component: "SearchIndexerService",
            action: "fullReindexSellers",
            offset,
          });
          errors += documents.length;
        }

        // Next batch
        offset += BATCH_SIZE;

        if (sellers.length < BATCH_SIZE) break;
      }

      logger.info(
        `[SearchIndexer] Full seller reindex complete: ${indexed} sellers indexed, ${errors} errors`,
      );

      return { indexed, errors };
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("[SearchIndexer] Full seller reindex failed", error, {
        component: "SearchIndexerService",
        action: "fullReindexSellers",
      });
      throw error;
    }
  }

  /**
   * Update single seller in index
   */
  static async updateSeller(
    sellerId: string,
    options: { orgId: string },
  ): Promise<void> {
    try {
      const seller = await this.fetchSellerById(sellerId, options.orgId);
      if (!seller) {
        logger.warn(`[SearchIndexer] Seller not found: ${sellerId}`, {
          component: "SearchIndexerService",
          action: "updateSeller",
          sellerId,
          orgId: options.orgId,
        });
        return;
      }

      const documents = this.transformSellersToDocuments([seller]);

      const index = searchClient.index(INDEXES.SELLERS);
      await withMeiliResilience("seller-update", "index", () =>
        index.addDocuments(documents),
      );

      logger.info(`[SearchIndexer] Updated seller in search: ${sellerId}`, {
        component: "SearchIndexerService",
        action: "updateSeller",
        sellerId,
        orgId: options.orgId,
      });
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error(
        `[SearchIndexer] Failed to update seller ${sellerId}`,
        error,
        {
          component: "SearchIndexerService",
          action: "updateSeller",
          sellerId,
          orgId: options.orgId,
        },
      );
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Fetch active listings from database
   * 🔐 STRICT v4.1: orgId is required for tenant isolation
   * 📊 Performance: Sorted by _id for consistent batching; requires index {orgId: 1, status: 1, _id: 1}
   */
  private static async fetchActiveListings(
    offset: number,
    limit: number,
    orgId: string, // Required for tenant isolation
  ): Promise<SouqListing[]> {
    if (!orgId) {
      throw new Error('orgId is required for fetchActiveListings (STRICT v4.1 tenant isolation)');
    }

    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    // Sort by _id for consistent batching under concurrent writes
    // Requires compound index: db.souq_listings.createIndex({orgId: 1, status: 1, _id: 1})
    const results = await db
      .collection<SouqListing>("souq_listings")
      .find({
        status: "active",
        orgId, // Required for tenant isolation
      })
      .sort({ _id: 1 }) // Stable sort for consistent pagination
      .skip(offset)
      .limit(limit)
      .toArray();

    return results;
  }

  /**
   * Fetch single listing by ID
   * 🔐 STRICT v4.1: orgId is required for tenant isolation
   */
  private static async fetchListingById(
    listingId: string,
    orgId: string, // Required for tenant isolation
  ): Promise<SouqListing | null> {
    if (!orgId) {
      throw new Error('orgId is required for fetchListingById (STRICT v4.1 tenant isolation)');
    }

    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    const result = await db
      .collection<SouqListing>("souq_listings")
      .findOne({
        listingId,
        orgId, // Required for tenant isolation
      });

    return result;
  }

  /**
   * Fetch active sellers from database
   * 🔐 STRICT v4.1: orgId is required for tenant isolation
   * 📊 Performance: Sorted by _id for consistent batching; requires index {orgId: 1, status: 1, _id: 1}
   */
  private static async fetchActiveSellers(
    offset: number,
    limit: number,
    orgId: string, // Required for tenant isolation
  ): Promise<SouqSeller[]> {
    if (!orgId) {
      throw new Error('orgId is required for fetchActiveSellers (STRICT v4.1 tenant isolation)');
    }

    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    // 🔐 STRICT v4.1: souq_sellers.orgId is ObjectId; caller may pass string.
    // Use dual-type candidates to match both legacy string and ObjectId storage.
    const { ObjectId } = await import("mongodb");
    const orgCandidates = ObjectId.isValid(orgId)
      ? [orgId, new ObjectId(orgId)]
      : [orgId];
    const orgFilter = { $in: orgCandidates as Array<string | MongoObjectId> };

    // Sort by _id for consistent batching under concurrent writes
    // Requires compound index: db.souq_sellers.createIndex({orgId: 1, status: 1, _id: 1})
    const results = await db
      .collection<SouqSeller>("souq_sellers")
      .find(
        {
          status: "active",
          orgId: orgFilter, // Dual-type for tenant isolation
        } as Filter<SouqSeller>,
      )
      .sort({ _id: 1 }) // Stable sort for consistent pagination
      .skip(offset)
      .limit(limit)
      .toArray();

    return results;
  }

  /**
   * Fetch single seller by ID
   * 🔐 STRICT v4.1: orgId is required for tenant isolation
   */
  private static async fetchSellerById(
    sellerId: string,
    orgId: string, // Required for tenant isolation
  ): Promise<SouqSeller | null> {
    if (!orgId) {
      throw new Error('orgId is required for fetchSellerById (STRICT v4.1 tenant isolation)');
    }

    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    // 🔐 STRICT v4.1: souq_sellers.orgId is ObjectId; caller may pass string.
    // Use dual-type candidates to match both legacy string and ObjectId storage.
    const { ObjectId } = await import("mongodb");
    const orgCandidates = ObjectId.isValid(orgId)
      ? [orgId, new ObjectId(orgId)]
      : [orgId];
    const orgFilter = { $in: orgCandidates as Array<string | MongoObjectId> };

    const result = await db
      .collection<SouqSeller>("souq_sellers")
      .findOne(
        {
          sellerId,
          orgId: orgFilter, // Dual-type for tenant isolation
        } as Filter<SouqSeller>,
      );

    return result;
  }

  /**
   * Transform listings to Meilisearch documents
   * Combines listing + product data for search
   */
  private static async transformListingsToDocuments(
    listings: SouqListing[],
  ): Promise<ProductDocument[]> {
    if (!listings.length) return [];

    // All listings are fetched per-org; enforce single-org invariant defensively
    const orgIds = Array.from(new Set(listings.map((l) => l.orgId).filter(Boolean)));
    if (orgIds.length !== 1) {
      logger.error("[SearchIndexer] Listings batch spans multiple orgs - refusing to index to prevent cross-tenant leakage", {
        component: "SearchIndexerService",
        action: "transformListingsToDocuments",
        orgIds,
      });
      return [];
    }
    const orgId = orgIds[0];

    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    // Fetch associated products and sellers
    const productIds = listings.map((l) => l.productId);
    const sellerIds = listings.map((l) => l.sellerId);

    const products = await db
      .collection<SouqProduct>("souq_products")
      .find({ fsin: { $in: productIds }, orgId }) // Tenant-scoped lookup
      .toArray();

    // 🔐 STRICT v4.1: souq_sellers.orgId is ObjectId; orgId may be string.
    // Use dual-type candidates to match both legacy string and ObjectId storage.
    const { ObjectId } = await import("mongodb");
    const orgCandidatesForSellers = ObjectId.isValid(orgId)
      ? [orgId, new ObjectId(orgId)]
      : [orgId];
    const orgFilterForSellers = {
      $in: orgCandidatesForSellers as Array<string | MongoObjectId>,
    };
    const sellers = await db
      .collection<SouqSeller>("souq_sellers")
      .find(
        {
          sellerId: { $in: sellerIds },
          orgId: orgFilterForSellers,
        } as Filter<SouqSeller>, // Dual-type for tenant isolation
      )
      .toArray();

    // Create lookup maps
    const productMap = new Map(products.map((p) => [p.fsin, p]));
    const sellerMap = new Map(sellers.map((s) => [s.sellerId, s]));

    // Transform to search documents
    return listings
      .map((listing) => {
        const product = productMap.get(listing.productId);
        const seller = sellerMap.get(listing.sellerId);

        if (!product || !seller) {
          logger.warn(
            `[SearchIndexer] Missing data for listing ${listing.listingId}`,
            {
              component: "SearchIndexerService",
              action: "transformListingsToDocuments",
              listingId: listing.listingId,
            },
          );
          return null;
        }

        // STRICT v4.1: Reject listings without orgId to prevent cross-tenant data exposure
        if (!listing.orgId) {
          logger.error(
            `[SearchIndexer] Listing ${listing.listingId} missing orgId - skipping to prevent cross-tenant exposure`,
            {
              component: "SearchIndexerService",
              action: "transformListingsToDocuments",
              listingId: listing.listingId,
              fsin: product.fsin,
            },
          );
          return null;
        }

        // Calculate badges
        const badges: string[] = [];
        if (listing.fulfillmentMethod === "FBF") badges.push("fbf");
        if (listing.shippingOption === "fast") badges.push("fast-shipping");
        if (seller.badges.includes("top_seller")) badges.push("top-seller");
        if (product.badges.includes("best_seller")) badges.push("best-seller");

        return {
          id: `${listing.orgId}_${product.fsin}`, // Composite key for tenant isolation (STRICT v4.1)
          fsin: product.fsin,
          orgId: listing.orgId,
          title: product.title,
          description: product.description,
          brand: product.brand,
          category: product.category,
          subcategory: product.subcategory || "",
          price: listing.price,
          rating: product.rating,
          totalReviews: product.totalReviews,
          badges,
          inStock: listing.quantity > 0,
          imageUrl: product.images[0] || "",
          sellerId: seller.sellerId,
          sellerName: seller.tradeName,
          createdAt: new Date(listing.createdAt).getTime(),
        };
      })
      .filter(Boolean) as ProductDocument[];
  }

  /**
   * Transform sellers to Meilisearch documents
   * Generates composite id for tenant-safe indexing (STRICT v4.1)
   */
  private static transformSellersToDocuments(
    sellers: SouqSeller[],
  ): SellerDocument[] {
    return sellers
      .map((seller) => {
        // STRICT v4.1: Reject sellers without orgId to prevent cross-tenant data exposure
        if (!seller.orgId) {
          logger.error(
            `[SearchIndexer] Seller ${seller.sellerId} missing orgId - skipping to prevent cross-tenant exposure`,
            {
              component: "SearchIndexerService",
              action: "transformSellersToDocuments",
              sellerId: seller.sellerId,
            },
          );
          return null;
        }

        const orgId = seller.orgId.toString();
        return {
          id: `${orgId}_${seller.sellerId}`, // Composite key for tenant isolation (STRICT v4.1)
          sellerId: seller.sellerId,
          orgId,
          tradeName: seller.tradeName,
          legalName: seller.legalName || seller.tradeName,
          accountHealth: seller.accountHealth.overall,
          rating: seller.ratings.overall,
          totalOrders: seller.ratings.totalOrders,
          onTimeShippingRate: seller.accountHealth.onTimeShippingRate,
          odr: seller.accountHealth.odr,
          badges: seller.badges,
          createdAt: new Date(seller.createdAt).getTime(),
        };
      })
      .filter((doc): doc is SellerDocument => doc !== null);
  }
}
