/**
 * Tests for database initialization and fallback logic.
 *
 * Validates:
 *  - Uses mongoose.connect when available and not throwing
 *  - Falls back to MockDB when mongoose require fails
 *  - Falls back to MockDB when mongoose.connect throws
 *  - Caches global._mongoose to avoid reconnects
 *  - Exposes isMockDB reflecting USE_MOCK_DB env var
 *
 * Test framework: Jest (TypeScript)
 */

const ORIGINAL_ENV = { ...process.env };
const g: any = global as any;

// Helper to import the module under test (handles different source roots)
async function importMongoModule() {
  // Reset module cache between scenarios
  jest.resetModules();
  // Try lib/mongo first, then src/lib/mongo
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return await import('../../lib/mongo');
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return await import('../../src/lib/mongo');
  }
}

// Utility to set up a mocked mongoose module in jest registry
function mockMongoose(impl: {
  connect?: (uri?: string, opts?: any) => any;
}) {
  jest.doMock('mongoose', () => ({
    __esModule: true,
    default: impl,
    ...impl,
  }));
}

beforeEach(() => {
  // Clean environment and globals
  process.env = { ...ORIGINAL_ENV };
  delete g._mongoose;

  // Clear any manual mocks of mongoose
  jest.dontMock('mongoose');
  jest.resetModules();
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
  delete g._mongoose;
});

describe('lib/mongo db initialization', () => {
  test('uses mongoose.connect when mongoose is available and resolves', async () => {
    const connectSpy = jest.fn().mockResolvedValue({ readyState: 1, kind: 'mongoose' });
    mockMongoose({ connect: connectSpy });

    process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';

    const { db, isMockDB } = await importMongoModule();
    // db is a promise in both mongoose and mock implementations (async connect)
    const resolved = await db;

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(connectSpy).toHaveBeenCalledWith(
      'mongodb://localhost:27017/testdb',
      expect.objectContaining({ autoIndex: true, maxPoolSize: 10 })
    );
    expect(resolved).toEqual(expect.objectContaining({ kind: 'mongoose' }));
    expect(isMockDB).toBe(process.env.USE_MOCK_DB === 'true' ? true : false);
  });

  test('falls back to MockDB when require("mongoose") fails', async () => {
    // Simulate require failure
    jest.doMock('mongoose', () => {
      throw new Error('Module not found');
    });

    delete process.env.MONGODB_URI;

    const { db } = await importMongoModule();
    const resolved = await db;

    // The mock returns an object with readyState getter => 1 (connected)
    expect(resolved).toBeDefined();
    // We expect a connected-like object
    expect((resolved as any).readyState).toBe(1);
  });

  test('falls back to MockDB when mongoose.connect throws synchronously', async () => {
    const connectSpy = jest.fn(() => {
      throw new Error('connect failure');
    });
    mockMongoose({ connect: connectSpy });

    const { db } = await importMongoModule();
    const resolved = await db;

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect((resolved as any).readyState).toBe(1);
  });

  test('falls back to MockDB when mongoose.connect rejects', async () => {
    const connectSpy = jest.fn().mockRejectedValue(new Error('connect reject'));
    mockMongoose({ connect: connectSpy });

    const { db } = await importMongoModule();

    // Since code uses try/catch only around the connect call, a rejected promise
    // will not be caught synchronously. To simulate the intended fallback, we can
    // adapt by making connect throw synchronously. However, this test ensures that
    // even if rejected, awaiting db does not crash the test harness.
    await expect(db).resolves.toBeDefined();
    const resolved = await db;
    expect((resolved as any).readyState).toBe(1);
  });

  test('reuses global._mongoose if already present (caching)', async () => {
    // Pre-populate a cached connection
    const cached = Promise.resolve({ cached: true, readyState: 1 });
    (g as any)._mongoose = cached;

    // Even if mongoose is available, module should re-use cached value
    const connectSpy = jest.fn().mockResolvedValue({ readyState: 1, kind: 'mongoose' });
    mockMongoose({ connect: connectSpy });

    const { db } = await importMongoModule();
    const resolved = await db;

    expect(connectSpy).not.toHaveBeenCalled();
    expect(resolved).toEqual(expect.objectContaining({ cached: true }));
  });

  test('exports isMockDB based on USE_MOCK_DB env var', async () => {
    process.env.USE_MOCK_DB = 'true';
    const modTrue = await importMongoModule();
    expect(modTrue.isMockDB).toBe(true);

    process.env.USE_MOCK_DB = 'false';
    const modFalse = await importMongoModule();
    expect(modFalse.isMockDB).toBe(false);

    delete process.env.USE_MOCK_DB;
    const modUnset = await importMongoModule();
    expect(modUnset.isMockDB).toBe(false);
  });

  test('uses default URI when MONGODB_URI not provided', async () => {
    delete process.env.MONGODB_URI;

    const connectSpy = jest.fn().mockResolvedValue({ readyState: 1, kind: 'mongoose' });
    mockMongoose({ connect: connectSpy });

    const { db } = await importMongoModule();
    await db;

    expect(connectSpy).toHaveBeenCalledWith(
      'mongodb://localhost:27017/fixzit',
      expect.objectContaining({ autoIndex: true, maxPoolSize: 10 })
    );
  });

  test('MockDB.collection provides basic CRUD-like methods', async () => {
    // Force MockDB by removing mongoose
    jest.doMock('mongoose', () => {
      throw new Error('Module not found');
    });

    const { db } = await importMongoModule();
    const mockConn = await db;

    // @ts-ignore
    const col = await mockConn.collection('any');
    const insert = await col.insertOne({ a: 1 });
    expect(insert).toEqual(expect.objectContaining({ insertedId: expect.any(String) }));

    const found = await col.find().toArray();
    expect(Array.isArray(found)).toBe(true);

    const updated = await col.updateOne({}, {});
    expect(updated).toEqual(expect.objectContaining({ modifiedCount: 1 }));

    const deleted = await col.deleteOne({});
    expect(deleted).toEqual(expect.objectContaining({ deletedCount: 1 }));
  });

  test('MockDB.listCollections returns empty array', async () => {
    jest.doMock('mongoose', () => {
      throw new Error('Module not found');
    });

    const { db } = await importMongoModule();
    const mockConn = await db;

    const res = await mockConn.listCollections();
    const arr = await res.toArray();
    expect(arr).toEqual([]);
  });
});
describe('lib/mongo additional coverage', () => {
  test('forces MockDB when USE_MOCK_DB is true even if mongoose is available', async () => {
    // Depending on implementation, USE_MOCK_DB should drive isMockDB true and prefer MockDB.
    // If implementation still uses mongoose, this test will catch that mismatch.
    process.env.USE_MOCK_DB = 'true';
    const connectSpy = jest.fn().mockResolvedValue({ readyState: 1, kind: 'mongoose' });
    mockMongoose({ connect: connectSpy });

    const { db, isMockDB } = await importMongoModule();
    const resolved = await db;

    expect(isMockDB).toBe(true);
    // Expect either no connect attempt or the connection object to reflect MockDB behavior.
    // We assert connect not called as the preferred behavior when USE_MOCK_DB=true.
    expect(connectSpy).not.toHaveBeenCalled();
    // MockDB connection should present connected-like state
    expect((resolved as any).readyState).toBe(1);
  });

  test('gracefully handles malformed mongoose module (missing connect) and falls back to MockDB', async () => {
    // Provide a mongoose module without connect API
    // @ts-expect-error intentionally malformed
    mockMongoose({} as any);

    const { db } = await importMongoModule();
    const resolved = await db;

    expect((resolved as any).readyState).toBe(1);
  });

  test('multiple imports reuse the same global._mongoose and do not reconnect', async () => {
    const connectSpy = jest.fn().mockResolvedValue({ readyState: 1, id: 'first' });
    mockMongoose({ connect: connectSpy });

    // First import establishes the connection
    const first = await importMongoModule();
    const firstResolved = await first.db;
    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(firstResolved).toEqual(expect.objectContaining({ readyState: 1 }));

    // Second import should hit the cache and not call connect again
    const second = await importMongoModule();
    const secondResolved = await second.db;

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(secondResolved).toEqual(expect.objectContaining({ readyState: 1 }));
  });

  test('connect is called with default options when no env overrides are set', async () => {
    delete process.env.MONGODB_URI;
    delete process.env.USE_MOCK_DB;

    const connectSpy = jest.fn().mockResolvedValue({ readyState: 1, kind: 'mongoose' });
    mockMongoose({ connect: connectSpy });

    const { db } = await importMongoModule();
    await db;

    // Verifies default URI and options shape as asserted elsewhere, providing extra guard
    expect(connectSpy).toHaveBeenCalledWith(
      'mongodb://localhost:27017/fixzit',
      expect.objectContaining({
        autoIndex: expect.any(Boolean),
        maxPoolSize: expect.any(Number),
      }),
    );
  });

  test('MockDB.collection returns deterministic shapes across operations', async () => {
    // Force MockDB
    jest.doMock('mongoose', () => {
      throw new Error('Module not found');
    });

    const { db } = await importMongoModule();
    const conn = await db;
    // @ts-ignore
    const col = await conn.collection('det');

    const insertRes = await col.insertOne({ name: 'alpha' });
    expect(insertRes).toEqual(
      expect.objectContaining({
        acknowledged: expect.any(Boolean),
        insertedId: expect.any(String),
      })
    );

    const query = await col.find({ name: 'alpha' });
    expect(query).toHaveProperty('toArray');
    const rows = await query.toArray();
    expect(Array.isArray(rows)).toBe(true);

    const updateRes = await col.updateOne({ name: 'alpha' }, { $set: { name: 'beta' } });
    expect(updateRes).toEqual(
      expect.objectContaining({
        matchedCount: expect.any(Number),
        modifiedCount: expect.any(Number),
      })
    );

    const deleteRes = await col.deleteOne({ name: 'beta' });
    expect(deleteRes).toEqual(
      expect.objectContaining({
        deletedCount: expect.any(Number),
      })
    );
  });

  test('requiring mongoose throws then subsequent import after clearing mocks still works', async () => {
    // First attempt: mongoose module load fails
    jest.doMock('mongoose', () => {
      throw new Error('Module not found');
    });
    let mod = await importMongoModule();
    const firstResolved = await mod.db;
    expect((firstResolved as any).readyState).toBe(1);

    // Clear mock and provide a working mongoose; then import again
    jest.dontMock('mongoose');
    jest.resetModules();

    const connectSpy = jest.fn().mockResolvedValue({ readyState: 1, kind: 'mongoose' });
    mockMongoose({ connect: connectSpy });

    mod = await importMongoModule();
    const secondResolved = await mod.db;
    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect((secondResolved as any).readyState).toBe(1);
  });

  test('mongoose.connect receives provided custom URI when MONGODB_URI is set', async () => {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27018/customdb?retryWrites=true';
    const connectSpy = jest.fn().mockResolvedValue({ readyState: 1 });
    mockMongoose({ connect: connectSpy });

    const { db } = await importMongoModule();
    await db;

    expect(connectSpy).toHaveBeenCalledWith(
      'mongodb://127.0.0.1:27018/customdb?retryWrites=true',
      expect.any(Object),
    );
  });

  test('mongoose.connect called exactly once even if db awaited multiple times', async () => {
    const connectSpy = jest.fn().mockResolvedValue({ readyState: 1, once: true });
    mockMongoose({ connect: connectSpy });

    const { db } = await importMongoModule();
    const a = await db;
    const b = await db;

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(a).toEqual(expect.objectContaining({ readyState: 1 }));
    expect(b).toEqual(expect.objectContaining({ readyState: 1 }));
  });
});