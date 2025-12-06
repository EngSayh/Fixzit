import { MeiliSearch } from "meilisearch";
import { logger } from "@/lib/logger";
import { withMeiliResilience } from "@/lib/meilisearch-resilience";

let client: MeiliSearch | null = null;

const buildProductId = (orgId: string, id: string) => `${orgId}_${id}`;

/**
 * Get or create the shared Meilisearch client instance
 * @returns MeiliSearch client or null if not configured
 */
export function getMeiliSearchClient(): MeiliSearch | null {
  // Canonical env vars (STRICT): MEILI_HOST / MEILI_MASTER_KEY
  const host =
    process.env.MEILI_HOST ||
    process.env.MEILISEARCH_HOST || // backwards compatibility
    "";
  const apiKey =
    process.env.MEILI_MASTER_KEY ||
    process.env.MEILISEARCH_API_KEY || // backwards compatibility
    "";

  if (!client && host && apiKey) {
    client = new MeiliSearch({ host, apiKey });
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
    logger.warn("[Meilisearch] Not configured, skipping initialization");
    return;
  }

  try {
    // Configure products index
    await withMeiliResilience("products-configure", "index", () =>
      client.index("products").updateSettings({
        filterableAttributes: ["categoryId", "brandId", "isActive", "orgId"],
        sortableAttributes: ["createdAt", "updatedAt"],
        searchableAttributes: [
          "title",
          "description",
          "searchKeywords",
          "fsin",
        ],
        rankingRules: [
          "words",
          "typo",
          "proximity",
          "attribute",
          "sort",
          "exactness",
        ],
      }),
    );

    logger.info("[Meilisearch] Initialized products index");
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[Meilisearch] Failed to initialize indexes:", error);
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

  if (!product.orgId) {
    logger.error("[Meilisearch] orgId is required for product indexing (STRICT v4.1 tenant isolation)");
    return;
  }

  try {
    const compositeId = buildProductId(product.orgId, product.id);
    await withMeiliResilience("product-index", "index", () =>
      client
        .index("products")
        .addDocuments([{ ...product, id: compositeId }]),
    );
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[Meilisearch] Failed to index product:", error);
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
  orgId: string,
  updates: Partial<{
    title: string;
    description: string;
    isActive: boolean;
    searchKeywords: string[];
  }>,
): Promise<void> {
  const client = getMeiliSearchClient();
  if (!client) return;

  if (!orgId) {
    logger.error("[Meilisearch] orgId is required for product update (STRICT v4.1 tenant isolation)");
    return;
  }

  try {
    const compositeId = buildProductId(orgId, productId);
    await withMeiliResilience("product-update", "index", () =>
      client
        .index("products")
        .updateDocuments([{ id: compositeId, orgId, ...updates }]),
    );
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[Meilisearch] Failed to update product:", error);
  }
}

/**
 * Delete a product document from the index
 * @param productId Product ID to delete
 */
export async function deleteProduct(productId: string, orgId: string): Promise<void> {
  const client = getMeiliSearchClient();
  if (!client) return;

  if (!orgId) {
    logger.error("[Meilisearch] orgId is required for product delete (STRICT v4.1 tenant isolation)");
    return;
  }

  try {
    const compositeId = buildProductId(orgId, productId);
    await withMeiliResilience("product-delete", "index", () =>
      client.index("products").deleteDocument(compositeId),
    );
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[Meilisearch] Failed to delete product:", error);
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
  }>,
): Promise<void> {
  const client = getMeiliSearchClient();
  if (!client) return;

  try {
    const safeProducts = products
      .map((product) => {
        if (!product.orgId) {
          logger.error(
            "[Meilisearch] Skipping product without orgId (STRICT v4.1 tenant isolation)",
            { productId: product.id },
          );
          return null;
        }
        return { ...product, id: buildProductId(product.orgId, product.id) };
      })
      .filter(Boolean) as typeof products;

    await withMeiliResilience("product-bulk-index", "index", () =>
      client.index("products").addDocuments(safeProducts),
    );
    logger.info(`[Meilisearch] Bulk indexed ${safeProducts.length} products`);
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[Meilisearch] Failed to bulk index products:", error);
  }
}
