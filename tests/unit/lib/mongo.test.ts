/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Unit tests for src/lib/mongo.ts
 *
 * Testing library/framework note:
 * - Repo contains E2E specs under qa/tests (likely Playwright).
 * - No explicit unit test runner detected; these tests are authored to be compatible with Jest or Vitest.
 * - They use common APIs (describe/test/expect) and runtime-detect jest/vi for mocks and resetModules.
 *
 * Focus: validate environment gating, singleton connection caching, native DB accessor behavior,
 * and MockDB API surface. External dependencies (mongoose) are mocked.
 */

const path = require('path');

const g: any = globalThis as any;
const api = {
  isVitest: Boolean(g.vi),
  isJest: Boolean(g.jest),
  mock: (g.vi && g.vi.mock) || (g.jest && g.jest.mock),
  unmock: (g.vi && g.vi.unmock) || (g.jest && g.jest.unmock) || (() => {}),
  resetModules: (g.vi && g.vi.resetModules) || (g.jest && g.jest.resetModules) || (async () => {}),
  clearAllMocks: (g.vi && g.vi.clearAllMocks) || (g.jest && g.jest.clearAllMocks) || (() => {}),
};

function mockMongoose(factory: any) {
  if (!api.mock) { throw new Error('No mock() available. Run with Jest or Vitest.'); }
  if (api.isVitest) {
    api.mock('mongoose', factory);
  } else {
    api.mock('mongoose', factory, { virtual: true });
  }
}

function unmockMongoose() {
  try { api.unmock('mongoose'); } catch {}
}

const ORIGINAL_ENV = { ...process.env };

function setEnv(env: Record<string, string | undefined>) {
  process.env = { ...ORIGINAL_ENV, ...env };
}
function cleanupEnv() {
  process.env = { ...ORIGINAL_ENV };
}

const MODULE_PATH = path.join(__dirname, '../../../src/lib/mongo');

async function importUnderTest() {
  // Ensure mongoose mock is registered BEFORE importing, as the module under test requires it at top-level.
  // Import using a relative path to avoid relying on tsconfig path aliases.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(MODULE_PATH);
}

describe('lib/mongo connection management', () => {
  beforeEach(async () => {
    cleanupEnv();
    api.clearAllMocks();
    unmockMongoose();
    await api.resetModules();
  });

  afterAll(() => {
    cleanupEnv();
  });

  test('isMockDB is true when USE_MOCK_DB=true regardless of MONGODB_URI', async () => {
    setEnv({ USE_MOCK_DB: 'true', MONGODB_URI: 'mongodb://real-host/db' });
    await api.resetModules();

    mockMongoose(() => ({}));

    const mod = await importUnderTest();
    expect(mod.isMockDB).toBe(true);

    const conn = await mod.ensureConnection();
    expect(conn).toBeTruthy();
    expect(conn.readyState).toBe(1);

    const awaitedDb = await mod.db;
    expect(awaitedDb).toBe(conn);
  });

  test('USE_MOCK_DB case-insensitivity (TRUE => isMockDB true)', async () => {
    setEnv({ USE_MOCK_DB: 'TRUE', MONGODB_URI: 'mongodb://real-host/db' });
    await api.resetModules();

    mockMongoose(() => ({}));

    const mod = await importUnderTest();
    expect(mod.isMockDB).toBe(true);
    const conn = await mod.ensureConnection();
    expect(conn.readyState).toBe(1);
  });

  test('isMockDB is true when MONGODB_URI is empty and USE_MOCK_DB not set', async () => {
    setEnv({ USE_MOCK_DB: '', MONGODB_URI: '' });
    await api.resetModules();

    mockMongoose(() => ({}));

    const mod = await importUnderTest();
    expect(mod.isMockDB).toBe(true);

    const conn = await mod.ensureConnection();
    expect(conn).toBeTruthy();
    expect(conn.readyState).toBe(1);
  });

  test('real mode: connects via mongoose.connect once and caches promise', async () => {
    const fakeDbObj = { some: 'db' };
    const fakeConnection = { db: fakeDbObj };
    let connectMock: any;
    const fnFactory = (g.vi && g.vi.fn) || (g.jest && g.jest.fn);
    if (fnFactory) {
      connectMock = fnFactory();
      if (typeof connectMock.mockResolvedValue === 'function') {
        connectMock.mockResolvedValue({ ok: true });
      }
    } else {
      connectMock = () => Promise.resolve({ ok: true });
    }
    const fakeMongoose = {
      connect: connectMock,
      connection: fakeConnection,
    };

    setEnv({ USE_MOCK_DB: 'false', MONGODB_URI: 'mongodb://real/db' });
    await api.resetModules();

    mockMongoose(() => fakeMongoose);

    const mod = await importUnderTest();
    expect(mod.isMockDB).toBe(false);

    const c1 = await mod.ensureConnection();
    if (connectMock.mock) {
      expect(connectMock).toHaveBeenCalledTimes(1);
      expect(connectMock).toHaveBeenCalledWith('mongodb://real/db', expect.objectContaining({ autoIndex: true, maxPoolSize: 10 }));
    }
    const c2 = await mod.ensureConnection();
    if (connectMock.mock) {
      expect(connectMock).toHaveBeenCalledTimes(1);
    }
    expect(c2).toBe(c1);

    const db1 = await mod.getNativeDb();
    expect(db1).toBe(fakeDbObj);
    const db2 = await mod.getNativeDb();
    expect(db2).toBe(db1);
  });

  test('throws when real mode but mongoose is unavailable', async () => {
    setEnv({ USE_MOCK_DB: 'false', MONGODB_URI: 'mongodb://real/db' });
    await api.resetModules();

    // Simulate unavailability: make required mongoose resolve to undefined
    mockMongoose(() => undefined);

    const mod = await importUnderTest();
    expect(mod.isMockDB).toBe(false);
    await expect(mod.ensureConnection()).rejects.toThrow('Mongoose is not available in this runtime');
  });

  test('getNativeDb in mock mode resolves to the mock connection', async () => {
    setEnv({ USE_MOCK_DB: 'true', MONGODB_URI: 'mongodb://ignored/db' });
    await api.resetModules();

    mockMongoose(() => ({}));

    const mod = await importUnderTest();
    const conn = await mod.ensureConnection();
    const native = await mod.getNativeDb();
    expect(native).toBe(conn);
  });

  test('getNativeDb throws if mongoose.connection.db is missing after connection', async () => {
    let connectMock: any;
    const fnFactory = (g.vi && g.vi.fn) || (g.jest && g.jest.fn);
    if (fnFactory) {
      connectMock = fnFactory();
      if (typeof connectMock.mockResolvedValue === 'function') {
        connectMock.mockResolvedValue({ ok: true });
      }
    } else {
      connectMock = () => Promise.resolve({ ok: true });
    }
    const fakeMongoose = {
      connect: connectMock,
      connection: { db: null },
    };

    setEnv({ USE_MOCK_DB: 'false', MONGODB_URI: 'mongodb://real/db' });
    await api.resetModules();
    mockMongoose(() => fakeMongoose);

    const mod = await importUnderTest();
    await mod.ensureConnection();
    await expect(mod.getNativeDb()).rejects.toThrow('Mongoose connected but native db is unavailable');
  });

  test('MockDB.collection provides CRUD-like methods with expected shapes', async () => {
    setEnv({ USE_MOCK_DB: 'true' });
    await api.resetModules();
    mockMongoose(() => ({}));

    const mod = await importUnderTest();
    const dbConn = await mod.ensureConnection();

    const col = await dbConn.collection('any');
    const ins = await col.insertOne({ a: 1 });
    expect(ins).toEqual(expect.objectContaining({ insertedId: 'mock-id' }));

    const foundArr = await col.find().toArray();
    expect(Array.isArray(foundArr)).toBe(true);
    expect(foundArr.length).toBe(0);

    const one = await col.findOne({ a: 1 });
    expect(one).toBeNull();

    const upd = await col.updateOne({ a: 1 }, { $set: { a: 2 } });
    expect(upd).toEqual(expect.objectContaining({ modifiedCount: 1 }));

    const del = await col.deleteOne({ a: 2 });
    expect(del).toEqual(expect.objectContaining({ deletedCount: 1 }));

    const lists = await dbConn.listCollections();
    const toArr = await lists.toArray();
    expect(toArr).toEqual([]);
  });

  test('db export resolves and aligns with ensureConnection result (mock mode)', async () => {
    setEnv({ USE_MOCK_DB: 'true', MONGODB_URI: '' });
    await api.resetModules();
    mockMongoose(() => ({}));

    const mod = await importUnderTest();
    const ensured = await mod.ensureConnection();
    const awaitedDb = await mod.db;
    expect(awaitedDb).toBe(ensured);
  });
});