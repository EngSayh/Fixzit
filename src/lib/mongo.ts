// Centralized Mongo connection for the entire app.
// Guarantees: if MONGODB_URI is set and USE_MOCK_DB != 'true', we connect to a real MongoDB via Mongoose.
// Mock DB is used ONLY when explicitly requested or URI is missing.

import type { Db } from 'mongodb';

let mongoose: any;
try {
  mongoose = require('mongoose');
} catch {
  mongoose = null;
}

const uri = process.env.MONGODB_URI || '';
const forceMock = String(process.env.USE_MOCK_DB || '').toLowerCase() === 'true';

class MockDB {
  private connected: boolean = false;
  async connect() { this.connected = true; return this; }
  get readyState() { return 1; }
  async collection(_name: string) {
    return {
      insertOne: async (_doc: any) => ({ insertedId: 'mock-id' }),
      find: () => ({ toArray: async () => [], sort: () => this, limit: () => this }),
      findOne: async () => null,
      updateOne: async () => ({ modifiedCount: 1 }),
      deleteOne: async () => ({ deletedCount: 1 })
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
    // @ts-expect-error: Mock has collection/listCollections but not a real Db
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
