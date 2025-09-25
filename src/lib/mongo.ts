// Centralized Mongo connection for the entire app.
// Guarantees: if MONGODB_URI is set and USE_MOCK_DB != 'true', we connect to a real MongoDB via Mongoose.
// Mock DB is used ONLY when explicitly requested or URI is missing.

// Avoid hard dependency on mongodb types in environments without type resolution
type Db = any;

// For TS environments without Node typings
declare const require: any;

let mongoose: any;
try {
  mongoose = require('mongoose');
} catch {
  mongoose = null;
}

const env = (globalThis as any)?.process?.env || {};
const uri = env.MONGODB_URI || '';
const forceMock = String(env.USE_MOCK_DB || '').toLowerCase() === 'true';

class MockDB {
  private connected: boolean = false;
  async connect() { this.connected = true; return this; }
  get readyState() { return 1; }
  collection(_name: string) {
    const cursor = {
      sort: (_: any) => cursor,
      limit: (_: number) => cursor,
      toArray: async () => [] as any[],
    };
    return {
      insertOne: async (_doc: any) => ({ insertedId: 'mock-id' }),
      find: (_?: any) => cursor,
      findOne: async (_?: any) => null,
      updateOne: async (_filter?: any, _update?: any, _opts?: any) => ({ modifiedCount: 1 }),
      deleteOne: async (_filter?: any) => ({ deletedCount: 1 }),
      createIndex: async (_spec?: any, _opts?: any) => ({ ok: 1 })
    };
  }
  async listCollections() { return { toArray: async () => [] }; }
}

// Singletons
let connectionPromise: Promise<any> | null = null;
let nativeDbPromise: Promise<Db> | null = null;

export const isMockDB = forceMock || !uri;

export async function ensureConnection() {
  if (isMockDB) {
    if (!connectionPromise) connectionPromise = new MockDB().connect();
    return connectionPromise;
  }
  if (!mongoose) throw new Error('Mongoose is not available in this runtime');
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(uri, { autoIndex: true, maxPoolSize: 10 });
  }
  return connectionPromise;
}

// Backward compatible export used across routes: awaiting this ensures connection is established
export const db = ensureConnection();

// Native Db accessor for routes using collection()/listCollections()
export async function getNativeDb(): Promise<Db> {
  if (isMockDB) {
    // @ts-ignore Mock has collection/listCollections but not a real Db in dev
    return (await ensureConnection());
  }
  if (!nativeDbPromise) {
    await ensureConnection();
    const conn = mongoose.connection;
    if (!conn || !conn.db) throw new Error('Mongoose connected but native db is unavailable');
    nativeDbPromise = Promise.resolve(conn.db);
  }
  return nativeDbPromise;
}
