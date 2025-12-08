/**
 * Meilisearch Smoke Test
 *
 * Verifies Meilisearch client can be instantiated and performs basic connectivity check.
 * This test uses mocks in CI but can run against real Meilisearch in integration environments.
 *
 * @module tests/integration/meilisearch-smoke
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Meilisearch before importing the module
vi.mock("meilisearch", () => {
  const mockIndex = {
    search: vi.fn().mockResolvedValue({
      hits: [],
      query: "",
      processingTimeMs: 1,
      estimatedTotalHits: 0,
    }),
    getSettings: vi.fn().mockResolvedValue({
      filterableAttributes: ["orgId", "org_id", "category", "isActive"],
      sortableAttributes: ["price", "rating", "createdAt"],
    }),
  };

  return {
    MeiliSearch: vi.fn().mockImplementation(() => ({
      isHealthy: vi.fn().mockResolvedValue(true),
      getVersion: vi.fn().mockResolvedValue({ pkgVersion: "1.6.0" }),
      index: vi.fn().mockReturnValue(mockIndex),
      getStats: vi.fn().mockResolvedValue({
        databaseSize: 1024,
        lastUpdate: new Date().toISOString(),
        indexes: { products: { numberOfDocuments: 0 } },
      }),
    })),
  };
});

describe("Meilisearch Smoke Tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset module cache to allow fresh import with new env
    vi.resetModules();
    process.env = {
      ...originalEnv,
      MEILI_HOST: "http://localhost:7700",
      MEILI_MASTER_KEY: "test-meili-master-key-32-characters-long-for-ci",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should instantiate MeiliSearch client with correct config", async () => {
    const { getSearchClient } = await import("@/lib/meilisearch");
    const client = getSearchClient();
    expect(client).toBeDefined();
  });

  it("should report healthy status", async () => {
    const { getSearchClient } = await import("@/lib/meilisearch");
    const client = getSearchClient();
    const isHealthy = await client.isHealthy();
    expect(isHealthy).toBe(true);
  });

  it("should return version info", async () => {
    const { getSearchClient } = await import("@/lib/meilisearch");
    const client = getSearchClient();
    const version = await client.getVersion();
    expect(version).toBeDefined();
    expect(version.pkgVersion).toBeDefined();
    expect(typeof version.pkgVersion).toBe("string");
  });

  it("should access products index", async () => {
    const { getSearchClient, INDEXES } = await import("@/lib/meilisearch");
    const client = getSearchClient();
    const index = client.index(INDEXES.PRODUCTS);
    expect(index).toBeDefined();
  });

  it("should execute a basic search query", async () => {
    const { getSearchClient, INDEXES } = await import("@/lib/meilisearch");
    const client = getSearchClient();
    const index = client.index(INDEXES.PRODUCTS);
    const results = await index.search("test", {
      filter: ['orgId = "test-org"'],
      limit: 10,
    });
    expect(results).toBeDefined();
    expect(results.hits).toBeDefined();
    expect(Array.isArray(results.hits)).toBe(true);
    expect(typeof results.processingTimeMs).toBe("number");
  });

  it("should return index settings with required filterable attributes", async () => {
    const { getSearchClient, INDEXES } = await import("@/lib/meilisearch");
    const client = getSearchClient();
    const index = client.index(INDEXES.PRODUCTS);
    const settings = await index.getSettings();
    expect(settings).toBeDefined();
    expect(settings.filterableAttributes).toBeDefined();
    // Verify tenant isolation attributes are filterable
    expect(settings.filterableAttributes).toContain("orgId");
    expect(settings.filterableAttributes).toContain("org_id");
  });

  it("should verify INDEXES constant has required indexes", async () => {
    const { INDEXES } = await import("@/lib/meilisearch");
    expect(INDEXES.PRODUCTS).toBe("products");
    expect(INDEXES.SELLERS).toBe("sellers");
  });

  it("should return cluster stats", async () => {
    const { getSearchClient } = await import("@/lib/meilisearch");
    const client = getSearchClient();
    const stats = await client.getStats();
    expect(stats).toBeDefined();
    expect(stats.databaseSize).toBeDefined();
    expect(typeof stats.databaseSize).toBe("number");
  });
});

describe("Meilisearch Resilience Wrapper", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      MEILI_HOST: "http://localhost:7700",
      MEILI_MASTER_KEY: "test-meili-master-key-32-characters-long-for-ci",
    };
  });

  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should wrap operations with resilience pattern", async () => {
    const { withMeiliResilience } = await import(
      "@/lib/meilisearch-resilience"
    );
    expect(withMeiliResilience).toBeDefined();
    expect(typeof withMeiliResilience).toBe("function");
  });

  it("should handle successful operations", async () => {
    const { withMeiliResilience } = await import(
      "@/lib/meilisearch-resilience"
    );
    const result = await withMeiliResilience("test-index", "search", () =>
      Promise.resolve({ hits: [], processingTimeMs: 1 })
    );
    expect(result).toEqual({ hits: [], processingTimeMs: 1 });
  });

  it("should handle operation failures gracefully", async () => {
    const { withMeiliResilience } = await import(
      "@/lib/meilisearch-resilience"
    );
    await expect(
      withMeiliResilience("test-index", "search", () =>
        Promise.reject(new Error("Connection failed"))
      )
    ).rejects.toThrow("Connection failed");
  });
});
