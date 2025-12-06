import { MeiliSearch } from "meilisearch";
import { logger } from "@/lib/logger";
import { requireEnv } from "@/lib/env";
import { withMeiliResilience } from "@/lib/meilisearch-resilience";

// Lazy initialization - only validate and create client when actually used
let searchClientInstance: MeiliSearch | undefined;
export const getSearchClient = (): MeiliSearch => {
  if (searchClientInstance === undefined) {
    const meiliHost = process.env.MEILI_HOST || "http://localhost:7700";
    const meiliMasterKey = requireEnv("MEILI_MASTER_KEY", {
      testFallback: "test-meili-master-key-32-characters-long-for-ci",
    });
    searchClientInstance = new MeiliSearch({
      host: meiliHost,
      apiKey: meiliMasterKey,
    });
  }
  return searchClientInstance;
};

// For backwards compatibility, export searchClient as a getter
export const searchClient = new Proxy({} as MeiliSearch, {
  get(_target, prop: keyof MeiliSearch) {
    const client = getSearchClient();
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

// Index names
export const INDEXES = {
  PRODUCTS: "products",
  SELLERS: "sellers",
} as const;

// Product document interface
export interface ProductDocument {
  id: string; // Composite key: {orgId}_{fsin} for tenant isolation
  fsin: string;
  orgId: string; // Required for tenant isolation
  title: string;
  description: string;
  brand: string;
  category: string;
  subcategory: string;
  price: number;
  rating: number;
  totalReviews: number;
  badges: string[];
  inStock: boolean;
  imageUrl: string;
  sellerId: string;
  sellerName: string;
  createdAt: number; // Timestamp for sorting
}

// Seller document interface
export interface SellerDocument {
  id: string; // Composite key: {orgId}_{sellerId} for tenant isolation
  sellerId: string;
  orgId: string; // Required for tenant isolation
  tradeName: string;
  legalName: string;
  accountHealth: number;
  rating: number;
  totalOrders: number;
  onTimeShippingRate: number;
  odr: number;
  badges: string[];
  createdAt: number;
}

// Configure products index
export async function configureProductsIndex() {
  const index = getSearchClient().index(INDEXES.PRODUCTS);

  // Wait for index to be created
  await withMeiliResilience("products-configure", "index", () =>
    index.updateSettings({
      // Searchable attributes (weighted)
      searchableAttributes: [
        "title", // Weight: 100
        "brand", // Weight: 50
        "description", // Weight: 25
        "category",
        "subcategory",
      ],

      // Attributes for filtering
      filterableAttributes: [
        "orgId", // Required for tenant isolation
        "category",
        "subcategory",
        "price",
        "rating",
        "badges",
        "inStock",
        "sellerId",
      ],

      // Attributes for sorting
      sortableAttributes: ["price", "rating", "createdAt", "totalReviews"],

      // Attributes to display
      displayedAttributes: [
        "id",
        "fsin",
        "orgId",
        "title",
        "brand",
        "category",
        "price",
        "rating",
        "totalReviews",
        "badges",
        "inStock",
        "imageUrl",
        "sellerId",
        "sellerName",
      ],

      // Ranking rules (order matters)
      rankingRules: [
        "words", // Number of query words matched
        "typo", // Typo tolerance (fewer typos = higher rank)
        "proximity", // Proximity of query words
        "attribute", // Order of searchableAttributes
        "sort", // User-defined sorting
        "exactness", // Similarity of matched words
      ],

      // Typo tolerance
      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: {
          oneTypo: 5, // Allow 1 typo for words >= 5 chars
          twoTypos: 9, // Allow 2 typos for words >= 9 chars
        },
      },

      // Pagination
      pagination: {
        maxTotalHits: 1000,
      },

      // Faceting
      faceting: {
        maxValuesPerFacet: 100,
      },
    }),
  );

  logger.info(`Products index configured: ${INDEXES.PRODUCTS}`);
}

// Configure sellers index
export async function configureSellersIndex() {
  const index = getSearchClient().index(INDEXES.SELLERS);

  await withMeiliResilience("sellers-configure", "index", () =>
    index.updateSettings({
      searchableAttributes: ["tradeName", "legalName"],

      filterableAttributes: [
        "orgId", // Required for tenant isolation (STRICT v4.1)
        "accountHealth",
        "rating",
        "badges",
      ],

      sortableAttributes: ["rating", "totalOrders", "createdAt"],

      displayedAttributes: [
        "id",
        "sellerId",
        "orgId",
        "tradeName",
        "legalName",
        "accountHealth",
        "rating",
        "totalOrders",
        "onTimeShippingRate",
        "odr",
        "badges",
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

  logger.info(`Sellers index configured: ${INDEXES.SELLERS}`);
}

// Initialize all indexes
export async function initializeSearchIndexes() {
  const client = getSearchClient();

  // Helper to verify/migrate index primary key using raw info (avoids stale metadata)
  async function ensureIndexWithPrimaryKey(
    indexName: string,
    expectedPrimaryKey: string,
  ): Promise<void> {
    let index = client.index(indexName);

    // Attempt to create (harmless if already exists)
    try {
      await withMeiliResilience(`create-${indexName}-index`, "index", () =>
        client.createIndex(indexName, { primaryKey: expectedPrimaryKey }),
      );
      index = client.index(indexName);
    } catch (_error) {
      // Index likely exists; continue to validation
    }

    // Validate current primary key; recreate if mismatched or unset
    try {
      const info = await withMeiliResilience(
        `${indexName}-info`,
        "index",
        () => index.getRawInfo(),
      );
      const currentPrimaryKey = info.primaryKey;

      if (!currentPrimaryKey || currentPrimaryKey !== expectedPrimaryKey) {
        logger.warn(
          `[Meilisearch] Recreating index ${indexName} to enforce primaryKey='${expectedPrimaryKey}' (was '${currentPrimaryKey || "unset"}')`,
          { indexName, currentPrimaryKey, expectedPrimaryKey },
        );
        await withMeiliResilience(`delete-${indexName}-index`, "index", () =>
          client.deleteIndex(indexName),
        );
        await withMeiliResilience(`recreate-${indexName}-index`, "index", () =>
          client.createIndex(indexName, { primaryKey: expectedPrimaryKey }),
        );
        index = client.index(indexName);
      } else {
        logger.info(
          `[Meilisearch] Index ${indexName} verified with primaryKey='${expectedPrimaryKey}'`,
        );
      }
    } catch (_error) {
      logger.warn(
        `[Meilisearch] Could not validate primary key for ${indexName}; forcing recreation`,
        { error: _error instanceof Error ? _error.message : String(_error) },
      );
      await withMeiliResilience(`delete-${indexName}-index`, "index", () =>
        client.deleteIndex(indexName),
      );
      await withMeiliResilience(`recreate-${indexName}-index`, "index", () =>
        client.createIndex(indexName, { primaryKey: expectedPrimaryKey }),
      );
    }
  }

  try {
    // 🔐 STRICT v4.1: Verify/migrate indexes with composite 'id' primary key for tenant isolation
    await ensureIndexWithPrimaryKey(INDEXES.PRODUCTS, "id");
    await ensureIndexWithPrimaryKey(INDEXES.SELLERS, "id");

    // Configure indexes
    await configureProductsIndex();
    await configureSellersIndex();

    logger.info("All search indexes initialized and verified successfully");
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    logger.error("[Meilisearch] Failed to initialize search indexes", error);
    throw error;
  }
}
