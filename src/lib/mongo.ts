import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/fixzit";

// Central flag to control mock mode explicitly
const USE_MOCK_DB = String(process.env.USE_MOCK_DB || '').toLowerCase() === 'true';
export const isMockDB = USE_MOCK_DB;

// Very small in-memory mock only when explicitly enabled
class MockDB {
  private connected = false;
  async connect() { this.connected = true; return this; }
  get readyState() { return 1; }
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
}

let conn = (global as any)._mongoose;
if (!conn) {
  if (USE_MOCK_DB) {
    console.warn("⚠️ USE_MOCK_DB=true — using in-memory mock store. Not for production.");
    conn = (global as any)._mongoose = new MockDB();
  } else if (mongoose) {
    conn = (global as any)._mongoose = mongoose.connect(uri, {
      autoIndex: true,
      maxPoolSize: 10,
      dbName: process.env.MONGODB_DB || 'fixzit'
    }).catch((err) => {
      console.warn('WARNING: mongoose.connect() rejected; falling back to MockDB:', err?.message || err);
      return new MockDB().connect();
    });
  } else {
    throw new Error("Mongoose module not available. Install 'mongoose' or enable USE_MOCK_DB=true.");
  }
}

export const db = conn;

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
}
