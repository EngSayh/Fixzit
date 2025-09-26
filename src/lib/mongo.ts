import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || "";
const dbName = process.env.MONGODB_DB || "fixzit";
const USE_MOCK_DB = String(process.env.USE_MOCK_DB || '').toLowerCase() === 'true';
export const isMockDB = USE_MOCK_DB || !uri;

class MockDB {
  private connected = false;
  async connect() { this.connected = true; return this; }
  get readyState() { return 1; }
 chore/topbar-search-notifs-clean
  // minimal collection shim for callers expecting driver-like API
  collection(name: string) {
    return {
      insertOne: async (_doc: any) => ({ insertedId: 'mock-id' }),
      find: (_q?: any) => ({
        project: (_p: any) => ({
          limit: (_n: number) => ({ toArray: async () => [] })
        }),
        limit: (_n: number) => ({ toArray: async () => [] }),
        toArray: async () => []
      }),
      findOne: async () => null,
      updateOne: async () => ({ matchedCount: 0, modifiedCount: 0 }),
      deleteOne: async () => ({ deletedCount: 0 })
    };
  }
=======
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
  listCollections() { return { toArray: async () => [] as any[] }; }
 main
}

let conn = (global as any)._mongoose;
if (!conn) {
  if (isMockDB) {
    console.warn("⚠️ Mock DB mode — using in-memory stub. Not for production.");
    conn = (global as any)._mongoose = new MockDB().connect();
  } else if (uri) {
    conn = (global as any)._mongoose = mongoose.connect(uri, {
      dbName,
      autoIndex: true,
      maxPoolSize: 10,
 chore/topbar-search-notifs-clean
      dbName: process.env.MONGODB_DB || 'fixzit'
    }).catch((err) => {
      console.warn('WARNING: mongoose.connect() rejected; falling back to MockDB:', err?.message || err);
      return new MockDB().connect();

 main
    });
  } else {
    console.warn("⚠️ Falling back to MockDB (no MONGODB_URI set).");
    conn = (global as any)._mongoose = new MockDB().connect();
  }
}

export const db = conn;

 chore/topbar-search-notifs-clean
// Provide a Database-like handle for consumers expecting a MongoDB Database API
export async function getDatabase(): Promise<any> {
  const connection = await db;
  // Mock path exposes collection directly
  if (connection && typeof (connection as any).collection === 'function') return connection;
  // Mongoose path: prefer driver db
  const m = connection as any;
  if (m?.connection?.db) return m.connection.db;
  if (m?.db && typeof m.db.collection === 'function') return m.db;
  throw new Error('No database handle available');

export async function getNativeDb(): Promise<any> {
  if (isMockDB) {
    return await (db as any);
  }
  const m: any = await db;
  const connection = m?.connection || mongoose.connection;
  if (!connection || !connection.db) {
    throw new Error('Mongoose connection not ready');
  }
  return connection.db;
 main
}
