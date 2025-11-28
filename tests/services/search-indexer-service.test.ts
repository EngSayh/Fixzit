/**
 * Search Indexer Service Tests
 *
 * Tests for Meilisearch indexing operations:
 * - Full product reindex
 * - Full seller reindex
 * - Incremental listing updates
 * - Delete from index
 * - Error handling and resilience
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

// Hoist mock functions
const { mockDeleteAllDocuments, mockAddDocuments, mockDeleteDocument, mockIndex } = vi.hoisted(() => ({
  mockDeleteAllDocuments: vi.fn().mockResolvedValue({ taskUid: 1 }),
  mockAddDocuments: vi.fn().mockResolvedValue({ taskUid: 2 }),
  mockDeleteDocument: vi.fn().mockResolvedValue({ taskUid: 3 }),
  mockIndex: vi.fn(),
}));

// Setup mockIndex return value after hoisting
mockIndex.mockReturnValue({
  deleteAllDocuments: mockDeleteAllDocuments,
  addDocuments: mockAddDocuments,
  deleteDocument: mockDeleteDocument,
});

vi.mock("@/lib/meilisearch", () => ({
  searchClient: {
    index: mockIndex,
  },
  INDEXES: {
    PRODUCTS: "souq_products",
    SELLERS: "souq_sellers",
  },
  ProductDocument: {},
  SellerDocument: {},
}));

// Mock resilience wrapper - just execute the callback
vi.mock("@/lib/meilisearch-resilience", () => ({
  withMeiliResilience: vi.fn((_name, _type, callback) => callback()),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks
import { SearchIndexerService } from "@/services/souq/search-indexer-service";
import { logger } from "@/lib/logger";
import { withMeiliResilience } from "@/lib/meilisearch-resilience";

describe("SearchIndexerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIndex.mockReturnValue({
      deleteAllDocuments: mockDeleteAllDocuments,
      addDocuments: mockAddDocuments,
      deleteDocument: mockDeleteDocument,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("deleteFromIndex", () => {
    it("should delete a product from the search index", async () => {
      await SearchIndexerService.deleteFromIndex("FSIN123");

      expect(mockIndex).toHaveBeenCalledWith("souq_products");
      expect(mockDeleteDocument).toHaveBeenCalledWith("FSIN123");
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Deleted product from search")
      );
    });

    it("should throw on delete error", async () => {
      mockDeleteDocument.mockRejectedValueOnce(new Error("Delete failed"));

      await expect(
        SearchIndexerService.deleteFromIndex("FSIN123")
      ).rejects.toThrow("Delete failed");
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("updateListing", () => {
    it("should warn when listing is not found", async () => {
      // The fetchListingById is private but we can test behavior
      // When no listing exists, it should log warning
      vi.spyOn(
        SearchIndexerService as unknown as { fetchListingById: (id: string) => Promise<null> },
        "fetchListingById"
      ).mockResolvedValue(null);

      await SearchIndexerService.updateListing("NONEXISTENT");

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Listing not found"),
        expect.any(Object)
      );
      expect(mockAddDocuments).not.toHaveBeenCalled();
    });

    it("should delete inactive listings from index", async () => {
      const mockListing = {
        listingId: "L1",
        productId: "P1",
        sellerId: "S1",
        price: 100,
        quantity: 10,
        status: "inactive", // Not active
        fulfillmentMethod: "FBF",
        shippingOption: "standard",
        createdAt: new Date().toISOString(),
      };

      vi.spyOn(
        SearchIndexerService as unknown as { fetchListingById: (id: string) => Promise<typeof mockListing> },
        "fetchListingById"
      ).mockResolvedValue(mockListing);

      const deleteFromIndexSpy = vi.spyOn(
        SearchIndexerService,
        "deleteFromIndex"
      );
      deleteFromIndexSpy.mockResolvedValue();

      await SearchIndexerService.updateListing("L1");

      expect(deleteFromIndexSpy).toHaveBeenCalledWith("P1");
    });

    it("should update active listing in search index", async () => {
      const mockListing = {
        listingId: "L1",
        productId: "P1",
        sellerId: "S1",
        price: 100,
        quantity: 10,
        status: "active",
        fulfillmentMethod: "FBF",
        shippingOption: "standard",
        createdAt: new Date().toISOString(),
      };

      vi.spyOn(
        SearchIndexerService as unknown as { fetchListingById: (id: string) => Promise<typeof mockListing> },
        "fetchListingById"
      ).mockResolvedValue(mockListing);

      vi.spyOn(
        SearchIndexerService as unknown as { transformListingsToDocuments: (l: unknown[]) => Promise<[{fsin: string}]> },
        "transformListingsToDocuments"
      ).mockResolvedValue([{ fsin: "P1" }]);

      await SearchIndexerService.updateListing("L1");

      expect(mockAddDocuments).toHaveBeenCalledWith([{ fsin: "P1" }]);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Updated listing in search")
      );
    });
  });

  describe("fullReindexProducts", () => {
    it("should clear index when starting reindex", async () => {
      // Mock to return empty listings immediately
      vi.spyOn(
        SearchIndexerService as unknown as { fetchActiveListings: (o: number, l: number) => Promise<[]> },
        "fetchActiveListings"
      ).mockResolvedValue([]);

      const result = await SearchIndexerService.fullReindexProducts();

      expect(mockIndex).toHaveBeenCalledWith("souq_products");
      expect(mockDeleteAllDocuments).toHaveBeenCalled();
      expect(result).toEqual({ indexed: 0, errors: 0 });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Starting full product reindex")
      );
    });

    it("should throw on critical index setup failure", async () => {
      mockDeleteAllDocuments.mockRejectedValueOnce(
        new Error("Critical failure")
      );

      await expect(
        SearchIndexerService.fullReindexProducts()
      ).rejects.toThrow("Critical failure");
    });

    it("should process batches and track errors", async () => {
      const templateListing = {
        price: 100,
        quantity: 10,
        status: "active",
        fulfillmentMethod: "FBF",
        shippingOption: "standard",
        createdAt: new Date().toISOString(),
      };
      const listingBatch1 = Array.from({ length: 1000 }, (_item, idx) => ({
        ...templateListing,
        listingId: `L1-${idx}`,
        productId: `P1-${idx}`,
        sellerId: `S1-${idx}`,
      }));
      const listingBatch2 = Array.from({ length: 1000 }, (_item, idx) => ({
        ...templateListing,
        listingId: `L2-${idx}`,
        productId: `P2-${idx}`,
        sellerId: `S2-${idx}`,
      }));

      const fetchListingsSpy = vi.spyOn(
        SearchIndexerService as unknown as {
          fetchActiveListings: (o: number, l: number) => Promise<typeof listingBatch1>;
        },
        "fetchActiveListings"
      );
      fetchListingsSpy
        .mockResolvedValueOnce(listingBatch1)
        .mockResolvedValueOnce(listingBatch2)
        .mockResolvedValueOnce([]);

      const transformListingsSpy = vi.spyOn(
        SearchIndexerService as unknown as {
          transformListingsToDocuments: (l: typeof listingBatch1) => Promise<Array<{ fsin: string }>>;
        },
        "transformListingsToDocuments"
      );
      transformListingsSpy
        .mockResolvedValueOnce([{ fsin: "P1" }])
        .mockResolvedValueOnce([{ fsin: "P2" }]);

      mockAddDocuments.mockRejectedValueOnce(new Error("batch-1-failure"));
      mockAddDocuments.mockResolvedValueOnce({ taskUid: 4 });

      const result = await SearchIndexerService.fullReindexProducts();

      expect(fetchListingsSpy).toHaveBeenNthCalledWith(1, 0, 1000);
      expect(fetchListingsSpy).toHaveBeenNthCalledWith(2, 1000, 1000);
      expect(fetchListingsSpy).toHaveBeenNthCalledWith(3, 2000, 1000);
      expect(transformListingsSpy).toHaveBeenCalledTimes(2);
      expect(mockAddDocuments).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ indexed: 1, errors: 1 });
      expect(logger.error).toHaveBeenCalledWith(
        "[SearchIndexer] Failed to index batch",
        expect.any(Error),
        expect.objectContaining({
          component: "SearchIndexerService",
          action: "fullReindexProducts",
          offset: 0,
        })
      );
    });

    // Remaining pagination/resilience edge cases are covered in e2e flows.
  });

  describe("fullReindexSellers", () => {
    it("should clear seller index when starting reindex", async () => {
      vi.spyOn(
        SearchIndexerService as unknown as { fetchActiveSellers: (o: number, l: number) => Promise<[]> },
        "fetchActiveSellers"
      ).mockResolvedValue([]);

      const result = await SearchIndexerService.fullReindexSellers();

      expect(mockIndex).toHaveBeenCalledWith("souq_sellers");
      expect(mockDeleteAllDocuments).toHaveBeenCalled();
      expect(result).toEqual({ indexed: 0, errors: 0 });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Starting full seller reindex")
      );
    });

    it("should clear seller index with resilience and track batch errors", async () => {
      const templateSeller = {
        tradeName: "Seller",
        accountHealth: { overall: 90, onTimeShippingRate: 98, odr: 1 },
        ratings: { overall: 4.8, totalOrders: 100 },
        badges: [],
        status: "active",
        createdAt: new Date().toISOString(),
      };
      const sellersBatch1 = Array.from({ length: 1000 }, (_item, idx) => ({
        ...templateSeller,
        sellerId: `S1-${idx}`,
      }));
      const sellersBatch2 = Array.from({ length: 1000 }, (_item, idx) => ({
        ...templateSeller,
        sellerId: `S2-${idx}`,
      }));

      const fetchSellersSpy = vi.spyOn(
        SearchIndexerService as unknown as {
          fetchActiveSellers: (o: number, l: number) => Promise<typeof sellersBatch1>;
        },
        "fetchActiveSellers"
      );
      fetchSellersSpy
        .mockResolvedValueOnce(sellersBatch1)
        .mockResolvedValueOnce(sellersBatch2)
        .mockResolvedValueOnce([]);

      const transformSellersSpy = vi.spyOn(
        SearchIndexerService as unknown as {
          transformSellersToDocuments: (s: typeof sellersBatch1) => Array<{ sellerId: string }>;
        },
        "transformSellersToDocuments"
      );
      transformSellersSpy.mockReturnValueOnce([{ sellerId: "S1" }]);
      transformSellersSpy.mockReturnValueOnce([{ sellerId: "S2" }]);

      mockAddDocuments.mockRejectedValueOnce(new Error("seller-batch-failure"));
      mockAddDocuments.mockResolvedValueOnce({ taskUid: 5 });

      const result = await SearchIndexerService.fullReindexSellers();

      expect(withMeiliResilience).toHaveBeenCalledWith(
        "sellers-clear-index",
        "index",
        expect.any(Function)
      );
      expect(withMeiliResilience).toHaveBeenCalledWith(
        "sellers-batch-index",
        "index",
        expect.any(Function)
      );
      expect(fetchSellersSpy).toHaveBeenNthCalledWith(1, 0, 1000);
      expect(fetchSellersSpy).toHaveBeenNthCalledWith(2, 1000, 1000);
      expect(fetchSellersSpy).toHaveBeenNthCalledWith(3, 2000, 1000);
      expect(mockAddDocuments).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ indexed: 1, errors: 1 });
      expect(logger.error).toHaveBeenCalledWith(
        "[SearchIndexer] Failed to index seller batch",
        expect.any(Error),
        expect.objectContaining({
          component: "SearchIndexerService",
          action: "fullReindexSellers",
          offset: 0,
        })
      );
    });

    // Remaining pagination/resilience edge cases are covered in e2e flows.
  });
});
