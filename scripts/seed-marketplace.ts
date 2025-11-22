import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

const logInfo = (message: string) => {
  process.stdout.write(`${message}\n`);
};

const logError = (message: string, error?: unknown) => {
  const detail =
    error instanceof Error
      ? ` ${error.message}${error.stack ? `\n${error.stack}` : ''}`
      : error
      ? ` ${String(error)}`
      : '';
  process.stderr.write(`${message}${detail}\n`);
};

type MockDocument = Record<string, unknown>;

type MockDbInstance = {
  getCollection: (name: string) => MockDocument[];
  setCollection: (name: string, data: MockDocument[]) => void;
};

type MockDbModule = { MockDatabase: { getInstance: () => MockDbInstance } };

type UpsertFn = (
  collection: string,
  predicate: (entry: MockDocument) => boolean,
  doc: MockDocument
) => MockDocument;

const {
  DEFAULT_TENANT_ID,
  COLLECTIONS,
  createUpsert,
  getSeedData,
  resolveMockDatabase,
} = require('./seed-marketplace-shared.js') as {
  DEFAULT_TENANT_ID: string;
  COLLECTIONS: { SYNONYMS: string; PRODUCTS: string };
  createUpsert: (db: MockDbInstance) => UpsertFn;
  getSeedData: (tenantId?: string) => {
    synonyms: Array<Record<string, unknown>>;
    products: Array<Record<string, unknown>>;
  };
  resolveMockDatabase: () => MockDbModule["MockDatabase"];
};

const MockDatabase = (globalThis as Record<string, unknown>).__FIXZIT_MARKETPLACE_DB_MOCK__
  ? ((globalThis as Record<string, unknown>).__FIXZIT_MARKETPLACE_DB_MOCK__ as { getInstance: () => MockDbInstance })
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
      COLLECTIONS.SEARCH_SYNONYMS ?? COLLECTIONS.SYNONYMS ?? COLLECTIONS.SEARCH_SYNONYMS,
      (entry: Record<string, unknown>) => entry.locale === synonym.locale && entry.term === synonym.term,
      synonym,
    );
  });

  products.forEach((product) => {
    const productCollection = 'marketplaceproducts';
    upsert(
      productCollection,
      (entry: Record<string, unknown>) => entry.tenantId === tenantId && entry.slug === product.slug,
      product,
    );
  });

  logInfo('✔ Marketplace seed complete (MockDB)');
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
  main().catch(error => {
    logError('Failed to seed marketplace (MockDB)', error);
    process.exitCode = 1;
  });
}
