import { MeiliSearch } from 'meilisearch';
import { logger } from '@/lib/logger';


let client: MeiliSearch | null = null;

/**
 * Get or create the shared Meilisearch client instance
 * @returns MeiliSearch client or null if not configured
 */
export function getMeiliSearchClient(): MeiliSearch | null {
  if (!client && process.env.MEILISEARCH_HOST && process.env.MEILISEARCH_API_KEY) {
    client = new MeiliSearch({
      host: process.env.MEILISEARCH_HOST,
      apiKey: process.env.MEILISEARCH_API_KEY,
    });
  }
  return client;
}

/**
 * Initialize Meilisearch indexes with proper settings
 * Call this during application startup
 */
export async function initializeMeilisearch(): Promise<void> {
  const client = getMeiliSearchClient();
  if (!client) {
    logger.warn('[Meilisearch] Not configured, skipping initialization');
    return;
  }

  try {
    // Configure products index
    await client.index('products').updateSettings({
      filterableAttributes: ['categoryId', 'brandId', 'isActive', 'orgId'],
      sortableAttributes: ['createdAt', 'updatedAt'],
      searchableAttributes: ['title', 'description', 'searchKeywords', 'fsin'],
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
      ],
    });

    logger.info('[Meilisearch] Initialized products index');
  } catch (error) {
    logger.error('[Meilisearch] Failed to initialize indexes:', error);
    throw error;
  }
}

/**
 * Index a single product document
 * @param product Product data to index
 */
export async function indexProduct(product: {
  id: string;
  fsin: string;
  title: string;
  description?: string;
  categoryId: string;
  brandId?: string;
  searchKeywords?: string[];
  isActive: boolean;
  orgId: string;
}): Promise<void> {
  const client = getMeiliSearchClient();
  if (!client) return;

  try {
    await client.index('products').addDocuments([product]);
  } catch (error) {
    logger.error('[Meilisearch] Failed to index product:', error);
    // Don't throw - indexing failure shouldn't break product creation
  }
}

/**
 * Update an existing product document
 * @param productId Product ID
 * @param updates Partial product data to update
 */
export async function updateProduct(
  productId: string,
  updates: Partial<{
    title: string;
    description: string;
    isActive: boolean;
    searchKeywords: string[];
  }>
): Promise<void> {
  const client = getMeiliSearchClient();
  if (!client) return;

  try {
    await client.index('products').updateDocuments([
      { id: productId, ...updates },
    ]);
  } catch (error) {
    logger.error('[Meilisearch] Failed to update product:', error);
  }
}

/**
 * Delete a product document from the index
 * @param productId Product ID to delete
 */
export async function deleteProduct(productId: string): Promise<void> {
  const client = getMeiliSearchClient();
  if (!client) return;

  try {
    await client.index('products').deleteDocument(productId);
  } catch (error) {
    logger.error('[Meilisearch] Failed to delete product:', error);
  }
}

/**
 * Bulk index multiple products
 * @param products Array of products to index
 */
export async function bulkIndexProducts(
  products: Array<{
    id: string;
    fsin: string;
    title: string;
    description?: string;
    categoryId: string;
    brandId?: string;
    searchKeywords?: string[];
    isActive: boolean;
    orgId: string;
  }>
): Promise<void> {
  const client = getMeiliSearchClient();
  if (!client) return;

  try {
    await client.index('products').addDocuments(products);
    logger.info(`[Meilisearch] Bulk indexed ${products.length} products`);
  } catch (error) {
    logger.error('[Meilisearch] Failed to bulk index products:', error);
  }
}
