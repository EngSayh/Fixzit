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
  test('MockDB.collection handles unexpected inputs gracefully (no throws)', async () => {
    jest.doMock("mongoose", () => { throw new Error("Module not found"); });
    const { db } = await importMongoModule();
    const mockConn = await db;
    // @ts-ignore
    const col = await mockConn.collection(undefined as any);
    await expect(col.insertOne(undefined as any)).resolves.toEqual(expect.objectContaining({ insertedId: expect.any(String) }));
    await expect(col.updateOne(undefined as any, undefined as any)).resolves.toEqual(expect.objectContaining({ modifiedCount: expect.any(Number) }));
    await expect(col.deleteOne(undefined as any)).resolves.toEqual(expect.objectContaining({ deletedCount: expect.any(Number) }));
    const cursor = await col.find(undefined as any);
    await expect(cursor.toArray()).resolves.toEqual(expect.any(Array));
  });
  test('exports stable shape: db is a Promise and isMockDB is boolean (MockDB path)', async () => {
    jest.doMock("mongoose", () => { throw new Error("Module not found"); });
    const mod = await importMongoModule();
    expect(typeof mod.isMockDB).toBe("boolean");
    expect(typeof (mod.db as any).then).toBe("function");
    const resolved = await mod.db;
    expect((resolved as any).readyState).toBe(1);
  });
  test('exports stable shape: db is a Promise and isMockDB is boolean (mongoose path)', async () => {
    const connectSpy = jest.fn().mockResolvedValue({ readyState: 1 });
    mockMongoose({ connect: connectSpy });
    const mod = await importMongoModule();
    expect(typeof mod.isMockDB).toBe("boolean");
    expect(typeof (mod.db as any).then).toBe("function");
    await mod.db;
  });
  test('uses default URI when MONGODB_URI is blank string', async () => {
    process.env.MONGODB_URI = "";
    const connectSpy = jest.fn().mockResolvedValue({ readyState: 1, kind: "mongoose" });
    mockMongoose({ connect: connectSpy });

    const { db } = await importMongoModule();
    await db;

    expect(connectSpy).toHaveBeenCalledTimes(1);
    const calledWith = connectSpy.mock.calls[0][0];
    expect(typeof calledWith).toBe("string");
    // Expect fallback default used (as in existing default URI test)
    expect(calledWith).toBe("mongodb://localhost:27017/fixzit");
  });
  test('re-importing the module uses cached global connection and avoids reconnect', async () => {
    const connectSpy = jest.fn().mockResolvedValue({ readyState: 1, kind: "mongoose" });
    mockMongoose({ connect: connectSpy });

    const first = await importMongoModule();
    const firstResolved = await first.db;
    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect((firstResolved as any).readyState).toBe(1);

    // Prepare for a second import; import helper resets modules, so reapply the mock before second import
    mockMongoose({ connect: connectSpy });
    const second = await importMongoModule();
    const secondResolved = await second.db;

    // Still should be 1 connect call due to global cache
    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(secondResolved).toEqual(firstResolved);
  });
  test('does not reconnect when awaiting db concurrently (single connect call)', async () => {
    const connectSpy = jest.fn().mockResolvedValue({ readyState: 1, kind: "mongoose", marker: Math.random() });
    mockMongoose({ connect: connectSpy });

    const { db } = await importMongoModule();

    const [a, b, c] = await Promise.all([db, db, db]);

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
    expect((a as any).readyState).toBe(1);
  });
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