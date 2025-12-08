import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const isProdLike =
  process.env.NODE_ENV === "production" || process.env.CI === "true";
if (isProdLike) {
  console.error(
    "Seeding blocked in production/CI. Set ALLOW_SEED=1 only in non-production.",
  );
  process.exit(1);
}
if (process.env.ALLOW_SEED !== "1") {
  console.error("Set ALLOW_SEED=1 to run seed-marketplace.ts in non-production.");
  process.exit(1);
}

const logInfo = (message: string) => {
  process.stdout.write(`${message}\n`);
};

const logError = (message: string, error?: unknown) => {
  const detail =
    error instanceof Error
      ? ` ${error.message}${error.stack ? `\n${error.stack}` : ""}`
      : error
        ? ` ${String(error)}`
        : "";
  process.stderr.write(`${message}${detail}\n`);
};

type MockDocument = Record<string, unknown>;

type MockDbInstance = {
  getCollection: (_name: string) => MockDocument[];
  setCollection: (_name: string, _data: MockDocument[]) => void;
};

type MockDbModule = { MockDatabase: { getInstance: () => MockDbInstance } };

type UpsertFn = (
  _collection: string,
  _predicate: (_entry: MockDocument) => boolean,
  _doc: MockDocument,
) => MockDocument;

let DEFAULT_TENANT_ID = "demo-tenant";
let COLLECTIONS = { SYNONYMS: "searchsynonyms", SEARCH_SYNONYMS: "searchsynonyms", PRODUCTS: "marketplaceproducts" };
let createUpsert: (_db: MockDbInstance) => UpsertFn = (db) => {
  return (collection: string, predicate: (_entry: MockDocument) => boolean, doc: MockDocument) => {
    const existing = db.getCollection(collection);
    const foundIndex = existing.findIndex((entry) => {
      try {
        return predicate(entry);
      } catch (err) {
        throw err;
      }
    });
    const now = new Date();
    if (foundIndex >= 0) {
      const current = existing[foundIndex];
      const merged = {
        ...current,
        ...doc,
        _id: current._id ?? `seed_${Date.now()}`,
        createdAt: current.createdAt ?? now.toISOString(),
        updatedAt: now.toISOString(),
      };
      existing[foundIndex] = merged;
      db.setCollection(collection, existing);
      return merged;
    }
    const created = {
      ...doc,
      _id: (doc as any)?._id ?? `seed_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    existing.push(created);
    db.setCollection(collection, existing);
    return created;
  };
};
let getSeedData: (_tenantId?: string) => { synonyms: Array<Record<string, unknown>>; products: Array<Record<string, unknown>> } = (
  tenantId = DEFAULT_TENANT_ID,
) => ({
  synonyms: [
    {
      locale: "en",
      term: "ac filter",
      synonyms: ["hvac filter", "air filter", "فلتر مكيف"],
    },
    {
      locale: "ar",
      term: "دهان",
      synonyms: ["طلاء", "paint", "painter"],
    },
  ],
  products: [
    {
      tenantId,
      sku: "CEM-001-50",
      slug: "portland-cement-type-1-2-50kg",
      title: { en: "Portland Cement Type I/II — 50kg", ar: "أسمنت بورتلاند نوع 1/2 - 50 كجم" },
      brand: "Fixzit Materials",
      prices: [{ currency: "SAR", listPrice: 16.5 }],
      inventories: [{ onHand: 200, leadDays: 2 }],
      rating: { avg: 4.6, count: 123 },
      images: [],
      searchable: { en: "Portland Cement Type I/II — 50kg" },
    },
  ],
});
let resolveMockDatabase: () => MockDbModule["MockDatabase"] = () => require("./seed-marketplace-shared.js").resolveMockDatabase();

try {
  const shared = require("./seed-marketplace-shared.js") as {
    DEFAULT_TENANT_ID: string;
    COLLECTIONS: { SYNONYMS: string; PRODUCTS: string; SEARCH_SYNONYMS?: string };
    createUpsert: (_db: MockDbInstance) => UpsertFn;
    getSeedData: (_tenantId?: string) => {
      synonyms: Array<Record<string, unknown>>;
      products: Array<Record<string, unknown>>;
    };
    resolveMockDatabase: () => MockDbModule["MockDatabase"];
  };
  DEFAULT_TENANT_ID = shared.DEFAULT_TENANT_ID ?? DEFAULT_TENANT_ID;
  COLLECTIONS = { ...COLLECTIONS, ...shared.COLLECTIONS };
  createUpsert = shared.createUpsert ?? createUpsert;
  getSeedData = shared.getSeedData ?? getSeedData;
  resolveMockDatabase = shared.resolveMockDatabase ?? resolveMockDatabase;
} catch {
  // Fall back to inline definitions if shared module not available
}

const MockDatabase = (globalThis as Record<string, unknown>)
  .__FIXZIT_MARKETPLACE_DB_MOCK__
  ? ((globalThis as Record<string, unknown>).__FIXZIT_MARKETPLACE_DB_MOCK__ as {
      getInstance: () => MockDbInstance;
    })
  : resolveMockDatabase();

// Idempotent seed for demo-tenant marketplace data when using MockDB
const db = MockDatabase.getInstance();

export const upsert = createUpsert(db);

export async function main() {
  const tenantId = DEFAULT_TENANT_ID;
  const { synonyms, products } = getSeedData(tenantId);

  logInfo(`[Marketplace seed] Preparing data for tenant: ${tenantId}`);

  synonyms.forEach((synonym) => {
    upsert(
      COLLECTIONS.SEARCH_SYNONYMS ??
        COLLECTIONS.SYNONYMS ??
        COLLECTIONS.SEARCH_SYNONYMS,
      (entry: Record<string, unknown>) =>
        entry.locale === synonym.locale && entry.term === synonym.term,
      synonym,
    );
  });

  products.forEach((product) => {
    const productCollection = "marketplaceproducts";
    upsert(
      productCollection,
      (entry: Record<string, unknown>) =>
        entry.tenantId === tenantId && entry.slug === product.slug,
      product,
    );
  });

  logInfo("✔ Marketplace seed complete (MockDB)");
}

export default main;

const isDirectExecution = (() => {
  try {
    const thisFile = fileURLToPath(import.meta.url);
    const entryArg = process.argv[1];
    if (!entryArg) {
      return false;
    }
    const entryPath = path.resolve(entryArg);
    return entryPath === thisFile;
  } catch {
    return false;
  }
})();

if (isDirectExecution) {
  main().catch((error) => {
    logError("Failed to seed marketplace (MockDB)", error);
    process.exitCode = 1;
  });
}
