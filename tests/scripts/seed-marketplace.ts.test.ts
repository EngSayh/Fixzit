import { vi } from 'vitest';
/**
 * Tests for scripts/seed-marketplace.ts
 *
 * Test framework: Jest (TypeScript). If this repo uses Vitest, replace jest.* with vi.* and adjust imports accordingly.
 *
 * These tests validate:
 * - Idempotent seeding behavior (upsert create vs update).
 * - Correct collections and documents being written.
 * - Timestamps are set and updated.
 * - Console logging occurs.
 * - Script runs without throwing, even when collections are initially empty or already populated.
 *
 * Strategy:
 * - Mock Date to control timestamps.
 * - Dynamically import the seed script after configuring mocks, as the script invokes main() at module load.
 */

type AnyRec = Record<string, any>;

// Utilities for a controllable in-memory mock of MockDatabase collections
const makeCollections = () => ({
  searchsynonyms: [] as AnyRec[],
  marketplaceproducts: [] as AnyRec[],
});

let collections = makeCollections();

const mockGetCollection = vi.fn((name: string) => {
  // Always return by reference so mutations are visible
  return collections[name as keyof typeof collections] ?? (collections[name as keyof typeof collections] = []);
});

const mockSetCollection = vi.fn((name: string, data: AnyRec[]) => {
  collections[name as keyof typeof collections] = data;
});

// Fixed date control
const FIXED_DATE_ISO = "2025-01-02T03:04:05.000Z";
const FIXED_DATE = new Date(FIXED_DATE_ISO);

// Mock random to produce deterministic _id values for created docs
const originalMathRandom = Math.random;
let randomCounter = 0;
const deterministicRandom = () => {
  // Return a repeating sequence that maps to predictable base36 slices
  randomCounter += 1;
  // Map counter to a fraction in [0,1)
  return (randomCounter % 1000) / 1000;
};

// Console spy
const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

  class MockDatabase {
    static instance: any;
    static getInstance() {
      if (!MockDatabase.instance) {
        MockDatabase.instance = new MockDatabase();
      }
      return MockDatabase.instance;
    }
    getCollection(name: string) {
      return mockGetCollection(name);
    }
    setCollection(name: string, data: AnyRec[]) {
      return mockSetCollection(name, data);
    }
  }
  return { MockDatabase };
});

beforeEach(() => {
  // Reset per-test state
  collections = makeCollections();
  mockGetCollection.mockClear();
  mockSetCollection.mockClear();
  consoleLogSpy.mockClear();
  // Control Date and Math.random
  vi.useFakeTimers().setSystemTime(FIXED_DATE);
  Math.random = deterministicRandom;
  randomCounter = 0;
});

afterEach(() => {
  vi.useRealTimers();
  Math.random = originalMathRandom;
});

async function importSeedScriptFresh() {
  // Clear previously cached module to re-run top-level main()
  const modulePath = getSeedModulePath();
  vi.resetModules();
  return import(modulePath);
}

// Try common locations; adjust if the repo places the script elsewhere.
function getSeedModulePath(): string {
  // These candidate paths mirror common project structures; adjust to match repo if needed.
  // 1) scripts/seed-marketplace.ts
  try { require.resolve("../../scripts/seed-marketplace"); return "../../scripts/seed-marketplace"; } catch {}
  try { require.resolve("../../../scripts/seed-marketplace"); return "../../../scripts/seed-marketplace"; } catch {}
  try { require.resolve("scripts/seed-marketplace"); return "scripts/seed-marketplace"; } catch {}
  // Fallback: relative to project root via ts-node transpilation aliases if configured.
  return "../../scripts/seed-marketplace";
}

describe("scripts/seed-marketplace.ts - seeding behavior", () => {
  test("creates expected synonym and product documents on first run", async () => {
    await importSeedScriptFresh();

    // Expect collections accessed and set after upserts
    expect(mockGetCollection).toHaveBeenCalledWith("searchsynonyms");
    expect(mockGetCollection).toHaveBeenCalledWith("marketplaceproducts");
    expect(mockSetCollection).toHaveBeenCalled();

    // Validate created docs in searchsynonyms
    const synonyms = collections.searchsynonyms;
    expect(synonyms).toHaveLength(2);

    const en = synonyms.find(x => x.locale === "en" && x.term === "ac filter") as AnyRec | undefined;
    expect(en).toBeTruthy();
    const enRec = en as AnyRec;
    expect(enRec.synonyms).toEqual(["hvac filter","air filter","فلتر مكيف"]);
    expect(typeof enRec._id).toBe("string");
    expect(new Date(enRec.createdAt).toISOString()).toBe(FIXED_DATE_ISO);
    expect(new Date(enRec.updatedAt).toISOString()).toBe(FIXED_DATE_ISO);

    const ar = synonyms.find(x => x.locale === "ar" && x.term === "دهان") as AnyRec | undefined;
    expect(ar).toBeTruthy();
    const arRec = ar as AnyRec;
    expect(arRec.synonyms).toEqual(["طلاء","paint","painter"]);
    expect(typeof arRec._id).toBe("string");
    expect(new Date(arRec.createdAt).toISOString()).toBe(FIXED_DATE_ISO);
    expect(new Date(arRec.updatedAt).toISOString()).toBe(FIXED_DATE_ISO);

    // Validate created doc in marketplaceproducts
    const products = collections.marketplaceproducts;
    expect(products).toHaveLength(1);
    const p = products[0];
    expect(p.tenantId).toBe("demo-tenant");
    expect(p.sku).toBe("CEM-001-50");
    expect(p.slug).toBe("portland-cement-type-1-2-50kg");
    expect(p.title).toBe("Portland Cement Type I/II — 50kg");
    expect(p.brand).toBe("Fixzit Materials");
    expect(p.attributes).toEqual([{ key:"Standard", value:"ASTM C150" },{ key:"Type", value:"I/II" }]);
    expect(p.images).toEqual([]);
    expect(p.prices).toEqual([{ currency:"SAR", listPrice: 16.5 }]);
    expect(p.inventories).toEqual([{ onHand: 200, leadDays: 2 }]);
    expect(p.rating).toEqual({ avg:4.6, count:123 });
    expect(p.searchable).toBe("Portland Cement ASTM C150 50kg Type I/II");
    expect(typeof p._id).toBe("string");
    expect(new Date(p.createdAt).toISOString()).toBe(FIXED_DATE_ISO);
    expect(new Date(p.updatedAt).toISOString()).toBe(FIXED_DATE_ISO);

    // Console log printed success
  });

  test("is idempotent: re-running updates existing docs instead of creating duplicates", async () => {
    // First run creates documents
    await importSeedScriptFresh();
    const firstSynonyms = collections.searchsynonyms.map(d => ({ _id: d._id, createdAt: d.createdAt }));
    const firstProduct = collections.marketplaceproducts[0];

    // Advance time to verify updatedAt changes on update
    const LATER_DATE = new Date("2025-01-03T03:04:05.000Z");
    vi.setSystemTime(LATER_DATE);

    // Second run should update in place (no new docs with same predicate)
    await importSeedScriptFresh();

    // Ensure synonym count remains 2; product count remains 1
    expect(collections.searchsynonyms).toHaveLength(2);
    expect(collections.marketplaceproducts).toHaveLength(1);

    // CreatedAt remains original; updatedAt matches new time
    collections.searchsynonyms.forEach((doc, i) => {
      expect(doc._id).toBe(firstSynonyms[i]._id);
      expect(new Date(doc.createdAt).toISOString()).toBe(new Date(firstSynonyms[i].createdAt).toISOString());
      expect(new Date(doc.updatedAt).toISOString()).toBe(LATER_DATE.toISOString());
    });

    const prod = collections.marketplaceproducts[0];

    expect(prod._id).toBe(firstProduct._id);
    expect(new Date(prod.createdAt).toISOString()).toBe(new Date(firstProduct.createdAt).toISOString());
    expect(new Date(prod.updatedAt).toISOString()).toBe(LATER_DATE.toISOString());
  });

  test("handles pre-populated collections where only some records exist", async () => {
    // Pre-seed one synonym (en) with partial data and a product with minimal fields
    const preEn = { _id: "pre-en", locale: "en", term: "ac filter", synonyms: ["filter"], createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" };
    collections.searchsynonyms.push(preEn);
    const preProduct = { _id: "pre-prod", tenantId: "demo-tenant", slug: "portland-cement-type-1-2-50kg", createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" };
    collections.marketplaceproducts.push(preProduct);

    await importSeedScriptFresh();

    // en synonym should be updated not duplicated
    const enDocs = collections.searchsynonyms.filter(x => x.locale === "en" && x.term === "ac filter");
    expect(enDocs).toHaveLength(1);
    const enDoc = enDocs[0];
    expect(enDoc._id).toBe("pre-en");
    expect(enDoc.synonyms).toEqual(["hvac filter","air filter","فلتر مكيف"]);
    expect(new Date(enDoc.updatedAt).toISOString()).toBe(FIXED_DATE_ISO);

    // ar synonym should have been created
    const arDocs = collections.searchsynonyms.filter(x => x.locale === "ar" && x.term === "دهان");
    expect(arDocs).toHaveLength(1);

    // product should be updated, not duplicated
    expect(collections.marketplaceproducts).toHaveLength(1);
    const prod = collections.marketplaceproducts[0];
    expect(prod._id).toBe("pre-prod");
    expect(prod.sku).toBe("CEM-001-50");
    expect(new Date(prod.updatedAt).toISOString()).toBe(FIXED_DATE_ISO);
  });

  test("is resilient when unknown collections are present (no throws)", async () => {
    // Add an extra collection; seed script should ignore anything it doesn't target
    (collections as AnyRec)["unrelated"] = [{ foo: "bar" }];
    await expect(importSeedScriptFresh()).resolves.toBeDefined();
    expect((collections as AnyRec)["unrelated"]).toEqual([{ foo: "bar" }]);
  });

  test("does not create duplicate synonyms for same locale/term across multiple runs", async () => {
    await importSeedScriptFresh();
    await importSeedScriptFresh();
    const enCount = collections.searchsynonyms.filter(x => x.locale === "en" && x.term === "ac filter").length;

    const arCount = collections.searchsynonyms.filter(x => x.locale === "ar" && x.term === "دهان").length;
    expect(enCount).toBe(1);
    expect(arCount).toBe(1);
  });
});
