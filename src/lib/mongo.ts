// Use standard import (Node runtime for server routes)
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || "";

// Central flag to control mock mode explicitly
const USE_MOCK_DB = String(process.env.USE_MOCK_DB || '').toLowerCase() === 'true';
export const isMockDB = USE_MOCK_DB;

// Very small in-memory mock only when explicitly enabled or no URI
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
    conn = (global as any)._mongoose = new MockDB();
  } else if (mongoose && uri) {
    conn = (global as any)._mongoose = mongoose.connect(uri, {
      autoIndex: true,
      maxPoolSize: 10,
      dbName: process.env.MONGODB_DB || 'fixzit'
    });
  } else {
    throw new Error("Mongo URI missing or mongoose unavailable. Set MONGODB_URI or enable USE_MOCK_DB=true.");
  }
}

export const db = conn;

// Expose native driver Db for routes that need collection-level access
export async function getNativeDb(): Promise<any> {
  if (isMockDB) {
    // Return mock instance which implements collection() and listCollections()
    return await (db as any);
  }
  const m: any = await db; // mongoose connection promise
  const connection = m?.connection || mongoose.connection;
  if (!connection || !connection.db) {
    throw new Error('Mongoose connection not ready');
  }
  return connection.db;
}
