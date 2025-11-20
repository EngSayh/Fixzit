const fs = require('node:fs');
const Module = require('module');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { createRequire } = require('node:module');

// Define marketplace collection names inline
const MARKETPLACE_COLLECTIONS = {
  PRODUCTS: 'marketplace_products',
  CATEGORIES: 'marketplace_categories',
  BRANDS: 'marketplace_brands',
  REVIEWS: 'marketplace_reviews',
  SEARCH_SYNONYMS: 'searchsynonyms',
};

const localRequire = createRequire(__filename);
const compiledTsCache = new Map();

function loadTypeScriptModule(tsPath) {
  const absolutePath = path.resolve(tsPath);

  if (compiledTsCache.has(absolutePath)) {
    return compiledTsCache.get(absolutePath);
  }

  let typescript;
  try {
    typescript = localRequire('typescript');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to load TypeScript compiler. Install dependencies first. Original error: ${message}`);
  }

  const source = fs.readFileSync(absolutePath, 'utf8');
  const { outputText } = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
    fileName: absolutePath,
    reportDiagnostics: false,
  });

  const moduleInstance = new Module(absolutePath, module);
  moduleInstance.filename = absolutePath;
  moduleInstance.paths = Module._nodeModulePaths(path.dirname(absolutePath));
  moduleInstance._compile(outputText, absolutePath);

  compiledTsCache.set(absolutePath, moduleInstance.exports);
  return moduleInstance.exports;
}

const DEFAULT_TENANT_FALLBACK = 'demo-tenant';

const DEFAULT_TENANT_ID = (() => {
  const envValue = process.env.MARKETPLACE_DEFAULT_TENANT;
  if (typeof envValue !== 'string' || envValue.trim().length === 0) {
    return DEFAULT_TENANT_FALLBACK;
  }

  const trimmed = envValue.trim();
  // Tenant ID must be 3-50 characters long and contain only letters (A-Z, a-z), digits (0-9), underscores (_), or hyphens (-).
  const isValid = /^[A-Za-z0-9_-]{3,50}$/.test(trimmed);

  if (!isValid) {
    // eslint-disable-next-line no-console
    console.warn(
      `[MarketplaceSeed] Invalid MARKETPLACE_DEFAULT_TENANT value "${envValue}". Falling back to "${DEFAULT_TENANT_FALLBACK}".`
    );
    return DEFAULT_TENANT_FALLBACK;
  }

  return trimmed;
})();

const COLLECTIONS = MARKETPLACE_COLLECTIONS;

function normalizeDocument(doc) {
  if (!doc || typeof doc !== 'object') {
    return {};
  }
  return { ...doc };
}

function createUpsert(db) {
  if (!db || typeof db.getCollection !== 'function' || typeof db.setCollection !== 'function') {
    throw new Error('Mock database instance must expose getCollection/setCollection');
  }

  return function upsert(collection, predicate, doc) {
    const data = db.getCollection(collection);
    const idx = data.findIndex(predicate);
    const timestamp = Date.now();
    const normalizedDoc = normalizeDocument(doc);

    // Surface predicate errors even when the collection is empty so callers can catch issues early.
    try {
      predicate(normalizedDoc);
    } catch (error) {
      throw error;
    }

    if (idx >= 0) {
      const { _id: _ignoreId, createdAt: _ignoreCreatedAt, ...rest } = normalizedDoc;
      const updated = { ...data[idx], ...rest, updatedAt: new Date(timestamp) };
      data[idx] = updated;
      db.setCollection(collection, data);
      return updated;
    }

    const { _id: providedId, createdAt: providedCreatedAt, ...rest } = normalizedDoc;
    const created = {
      ...rest,
      _id: (typeof providedId === 'string' && providedId.length > 0) ? providedId : randomUUID(),
      createdAt: providedCreatedAt ? new Date(providedCreatedAt) : new Date(timestamp),
      updatedAt: new Date(timestamp),
    };

    data.push(created);
    db.setCollection(collection, data);
    return created;
  };
}

function resolveMockDatabase() {
  const candidates = [
    '../src/lib/mockDb.js',
    '../src/lib/mockDb.ts',
    '../src/lib/mockDb',
  ];

  const errors = [];

  for (const candidate of candidates) {
    try {
      const moduleExport = localRequire(candidate);
      if (moduleExport && moduleExport.MockDatabase) {
        return moduleExport.MockDatabase;
      }
      if (moduleExport && typeof moduleExport.getInstance === 'function') {
        return moduleExport;
      }
    } catch (error) {
      const absolutePath = path.resolve(__dirname, candidate);
      const message = error instanceof Error ? error.message : String(error);

      if (candidate.endsWith('.ts')) {
        try {
          const tsModule = loadTypeScriptModule(absolutePath);
          if (tsModule && tsModule.MockDatabase) {
            return tsModule.MockDatabase;
          }
          if (tsModule && typeof tsModule.getInstance === 'function') {
            return tsModule;
          }
          errors.push(`${absolutePath}: module did not expose MockDatabase`);
          continue;
        } catch (tsError) {
          const tsMessage = tsError instanceof Error ? tsError.message : String(tsError);
          errors.push(`${absolutePath}: ${tsMessage}`);
          continue;
        }
      }

      errors.push(`${absolutePath}: ${message}`);
    }
  }

  throw new Error(
    `MockDatabase implementation not found. Tried -> ${errors.join('; ')}`
  );
}

function getSeedData(tenantId = DEFAULT_TENANT_ID) {
  return {
    synonyms: [
      {
        locale: 'en',
        term: 'ac filter',
        synonyms: ['hvac filter', 'air filter', 'فلتر مكيف'],
      },
      {
        locale: 'ar',
        term: 'دهان',
        synonyms: ['طلاء', 'paint', 'painter'],
      },
    ],
    products: [
      {
        tenantId,
        sku: 'CEM-001-50',
        slug: 'portland-cement-type-1-2-50kg',
        title: {
          en: 'Portland Cement Type I/II — 50kg',
          ar: 'أسمنت بورتلاند نوع I/II — 50 كجم',
        },
        brand: 'Fixzit Materials',
        attributes: [
          { key: 'Standard', value: 'ASTM C150' },
          { key: 'Type', value: 'I/II' },
        ],
        images: [],
        prices: [{ currency: 'SAR', listPrice: 16.5 }],
        inventories: [{ onHand: 200, leadDays: 2 }],
        rating: { avg: 4.6, count: 123 },
        searchable: {
          en: 'Portland Cement ASTM C150 50kg Type I/II',
          ar: 'أسمنت بورتلاند ASTM C150 وزن 50 كجم نوع I/II',
        },
        rtl: true,
      },
    ],
  };
}

module.exports = {
  DEFAULT_TENANT_ID,
  COLLECTIONS,
  createUpsert,
  getSeedData,
  resolveMockDatabase,
};
