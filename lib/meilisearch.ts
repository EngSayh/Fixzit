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
  fsin: string;
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
  sellerId: string;
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
        "fsin",
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

      filterableAttributes: ["accountHealth", "rating", "badges"],

      sortableAttributes: ["rating", "totalOrders", "createdAt"],

      displayedAttributes: [
        "sellerId",
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
  try {
    // Create indexes if they don't exist
    await withMeiliResilience("create-products-index", "index", () =>
      getSearchClient().createIndex(INDEXES.PRODUCTS, { primaryKey: "fsin" }),
    );
    await withMeiliResilience("create-sellers-index", "index", () =>
      getSearchClient().createIndex(INDEXES.SELLERS, { primaryKey: "sellerId" }),
    );

    // Configure indexes
    await configureProductsIndex();
    await configureSellersIndex();

    logger.info("All search indexes initialized successfully");
  } catch (_error) {
    // Indexes might already exist, configure anyway
    logger.info("Search indexes already exist, configuring...");
    await configureProductsIndex();
    await configureSellersIndex();
  }
}
