import { MockDatabase } from '../src/lib/mockDb.js';
import { createRequire } from 'node:module';
import url from 'node:url';

const require = createRequire(import.meta.url);

const { DEFAULT_TENANT_ID, createUpsert, getSeedData } = require('./seed-marketplace-shared.js');

// Idempotent seed for demo-tenant marketplace data when using MockDB
const db = MockDatabase.getInstance();

export const upsert = createUpsert(db);

export async function main() {
  const tenantId = DEFAULT_TENANT_ID;
  const { synonyms, products } = getSeedData(tenantId);

  synonyms.forEach((synonym) => {
    upsert(
      'searchsynonyms',
      (entry) => entry.locale === synonym.locale && entry.term === synonym.term,
      synonym,
    );
  });

  products.forEach((product) => {
    upsert(
      'marketplaceproducts',
      (entry) => entry.tenantId === tenantId && entry.slug === product.slug,
      product,
    );
  });

  console.log('✔ Marketplace seed complete (MockDB)');
}

const isDirectExecution = (() => {
  try {
    const thisFile = url.fileURLToPath(import.meta.url);
    const entryArg = process.argv[1];
    if (!entryArg) return false;
    const entryPath = url.fileURLToPath(url.pathToFileURL(entryArg));
    return entryPath === thisFile;
  } catch {
    return false;
  }
})();

if (isDirectExecution) {
  main().catch(error => {
    // eslint-disable-next-line no-console
    console.error('Failed to seed marketplace (MockDB)', error);
    process.exitCode = 1;
  });
}

export default main;

