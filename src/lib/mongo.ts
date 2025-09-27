import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || "";
const dbName = process.env.MONGODB_DB || "fixzit";
const USE_MOCK_DB = String(process.env.USE_MOCK_DB || '').toLowerCase() === 'true';
export const isMockDB = USE_MOCK_DB || !uri;

class MockDB {
  private connected = false;
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
  listCollections() { return { toArray: async () => [] as any[] }; }
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
    });
  } else {
    console.warn("⚠️ Falling back to MockDB (no MONGODB_URI set).");
    conn = (global as any)._mongoose = new MockDB().connect();
  }
}

export const db = conn;

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
}
