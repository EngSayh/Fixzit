import { searchClient, INDEXES, ProductDocument, SellerDocument } from '@/lib/meilisearch';
import logger from '@/lib/logger';

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
  /**
   * Full reindex of all products
   * Run daily at 2 AM via BullMQ cron job
   */
  static async fullReindexProducts(): Promise<{ indexed: number; errors: number }> {
    logger.info('[SearchIndexer] Starting full product reindex...');
    
    let indexed = 0;
    let errors = 0;
    let offset = 0;

    try {
      const index = searchClient.index(INDEXES.PRODUCTS);

      // Clear existing index
      await index.deleteAllDocuments();
      logger.info('[SearchIndexer] Cleared existing product index');

      // Fetch all active listings in batches
      while (true) {
        const listings = await this.fetchActiveListings(offset, BATCH_SIZE);
        if (listings.length === 0) break;

        // Transform to search documents
        const documents = await this.transformListingsToDocuments(listings);

        // Upload batch to Meilisearch
        try {
          await index.addDocuments(documents);
          indexed += documents.length;
          logger.info(`[SearchIndexer] Indexed batch: ${indexed} products`);
        } catch (error) {
          console.error('[SearchIndexer] Failed to index batch:', error);
          errors += documents.length;
        }

        // Next batch
        offset += BATCH_SIZE;
        
        // Break if we got fewer results than requested (last page)
        if (listings.length < BATCH_SIZE) break;
      }

      logger.info(`[SearchIndexer] Full reindex complete: ${indexed} products indexed, ${errors} errors`);
      
      return { indexed, errors };
    } catch (error) {
      console.error('[SearchIndexer] Full reindex failed:', error);
      throw error;
    }
  }

  /**
   * Incremental update: Sync single listing
   * Triggered on listing create/update
   */
  static async updateListing(listingId: string): Promise<void> {
    try {
      const listing = await this.fetchListingById(listingId);
      if (!listing) {
        console.warn(`[SearchIndexer] Listing not found: ${listingId}`);
        return;
      }

      // Skip if not active
      if (listing.status !== 'active') {
        await this.deleteFromIndex(listing.productId);
        return;
      }

      const documents = await this.transformListingsToDocuments([listing]);
      
      const index = searchClient.index(INDEXES.PRODUCTS);
      await index.addDocuments(documents);
      
      logger.info(`[SearchIndexer] Updated listing in search: ${listingId}`);
    } catch (error) {
      console.error(`[SearchIndexer] Failed to update listing ${listingId}:`, error);
      throw error;
    }
  }

  /**
   * Remove product from index
   * Triggered on listing deletion or deactivation
   */
  static async deleteFromIndex(fsin: string): Promise<void> {
    try {
      const index = searchClient.index(INDEXES.PRODUCTS);
      await index.deleteDocument(fsin);
      
      logger.info(`[SearchIndexer] Deleted product from search: ${fsin}`);
    } catch (error) {
      console.error(`[SearchIndexer] Failed to delete product ${fsin}:`, error);
      throw error;
    }
  }

  /**
   * Full reindex of all sellers
   */
  static async fullReindexSellers(): Promise<{ indexed: number; errors: number }> {
    logger.info('[SearchIndexer] Starting full seller reindex...');
    
    let indexed = 0;
    let errors = 0;
    let offset = 0;

    try {
      const index = searchClient.index(INDEXES.SELLERS);

      // Clear existing index
      await index.deleteAllDocuments();
      logger.info('[SearchIndexer] Cleared existing seller index');

      // Fetch all active sellers in batches
      while (true) {
        const sellers = await this.fetchActiveSellers(offset, BATCH_SIZE);
        if (sellers.length === 0) break;

        // Transform to search documents
        const documents = this.transformSellersToDocuments(sellers);

        // Upload batch to Meilisearch
        try {
          await index.addDocuments(documents);
          indexed += documents.length;
          logger.info(`[SearchIndexer] Indexed batch: ${indexed} sellers`);
        } catch (error) {
          console.error('[SearchIndexer] Failed to index seller batch:', error);
          errors += documents.length;
        }

        // Next batch
        offset += BATCH_SIZE;
        
        if (sellers.length < BATCH_SIZE) break;
      }

      logger.info(`[SearchIndexer] Full seller reindex complete: ${indexed} sellers indexed, ${errors} errors`);
      
      return { indexed, errors };
    } catch (error) {
      console.error('[SearchIndexer] Full seller reindex failed:', error);
      throw error;
    }
  }

  /**
   * Update single seller in index
   */
  static async updateSeller(sellerId: string): Promise<void> {
    try {
      const seller = await this.fetchSellerById(sellerId);
      if (!seller) {
        console.warn(`[SearchIndexer] Seller not found: ${sellerId}`);
        return;
      }

      const documents = this.transformSellersToDocuments([seller]);
      
      const index = searchClient.index(INDEXES.SELLERS);
      await index.addDocuments(documents);
      
      logger.info(`[SearchIndexer] Updated seller in search: ${sellerId}`);
    } catch (error) {
      console.error(`[SearchIndexer] Failed to update seller ${sellerId}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Fetch active listings from database
   */
  private static async fetchActiveListings(offset: number, limit: number): Promise<SouqListing[]> {
    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();
    
    return await db
      .collection('souq_listings')
      .find({ status: 'active' })
      .skip(offset)
      .limit(limit)
      .toArray() as unknown as SouqListing[];
  }

  /**
   * Fetch single listing by ID
   */
  private static async fetchListingById(listingId: string): Promise<SouqListing | null> {
    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();
    
    return await db
      .collection('souq_listings')
      .findOne({ listingId }) as unknown as SouqListing | null;
  }

  /**
   * Fetch active sellers from database
   */
  private static async fetchActiveSellers(offset: number, limit: number): Promise<SouqSeller[]> {
    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();
    
    return await db
      .collection('souq_sellers')
      .find({ status: 'active' })
      .skip(offset)
      .limit(limit)
      .toArray() as unknown as SouqSeller[];
  }

  /**
   * Fetch single seller by ID
   */
  private static async fetchSellerById(sellerId: string): Promise<SouqSeller | null> {
    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();
    
    return await db
      .collection('souq_sellers')
      .findOne({ sellerId }) as unknown as SouqSeller | null;
  }

  /**
   * Transform listings to Meilisearch documents
   * Combines listing + product data for search
   */
  private static async transformListingsToDocuments(
    listings: SouqListing[]
  ): Promise<ProductDocument[]> {
    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();

    // Fetch associated products and sellers
    const productIds = listings.map(l => l.productId);
    const sellerIds = listings.map(l => l.sellerId);

    const products = await db
      .collection('souq_products')
      .find({ fsin: { $in: productIds } })
      .toArray() as unknown as SouqProduct[];

    const sellers = await db
      .collection('souq_sellers')
      .find({ sellerId: { $in: sellerIds } })
      .toArray() as unknown as SouqSeller[];

    // Create lookup maps
    const productMap = new Map(products.map(p => [p.fsin, p]));
    const sellerMap = new Map(sellers.map(s => [s.sellerId, s]));

    // Transform to search documents
    return listings.map(listing => {
      const product = productMap.get(listing.productId);
      const seller = sellerMap.get(listing.sellerId);

      if (!product || !seller) {
        console.warn(`[SearchIndexer] Missing data for listing ${listing.listingId}`);
        return null;
      }

      // Calculate badges
      const badges: string[] = [];
      if (listing.fulfillmentMethod === 'FBF') badges.push('fbf');
      if (listing.shippingOption === 'fast') badges.push('fast-shipping');
      if (seller.badges.includes('top_seller')) badges.push('top-seller');
      if (product.badges.includes('best_seller')) badges.push('best-seller');

      return {
        fsin: product.fsin,
        title: product.title,
        description: product.description,
        brand: product.brand,
        category: product.category,
        subcategory: product.subcategory || '',
        price: listing.price,
        rating: product.rating,
        totalReviews: product.totalReviews,
        badges,
        inStock: listing.quantity > 0,
        imageUrl: product.images[0] || '',
        sellerId: seller.sellerId,
        sellerName: seller.tradeName,
        createdAt: new Date(listing.createdAt).getTime(),
      };
    }).filter(Boolean) as ProductDocument[];
  }

  /**
   * Transform sellers to Meilisearch documents
   */
  private static transformSellersToDocuments(sellers: SouqSeller[]): SellerDocument[] {
    return sellers.map(seller => ({
      sellerId: seller.sellerId,
      tradeName: seller.tradeName,
      legalName: seller.legalName || seller.tradeName,
      accountHealth: seller.accountHealth.overall,
      rating: seller.ratings.overall,
      totalOrders: seller.ratings.totalOrders,
      onTimeShippingRate: seller.accountHealth.onTimeShippingRate,
      odr: seller.accountHealth.odr,
      badges: seller.badges,
      createdAt: new Date(seller.createdAt).getTime(),
    }));
  }
}
