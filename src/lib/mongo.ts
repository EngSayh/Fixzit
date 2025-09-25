// Conditional import to avoid Edge Runtime issues
let mongoose: any;
try {
  mongoose = require("mongoose");
} catch {
  mongoose = null;
}

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/fixzit";

// Minimal mock as a last-resort fallback (only if Mongo is truly unavailable)
class MockDB {
  private connected: boolean = false;

  async connect() {
    if (this.connected) return this;
    console.warn("⚠️ Using in-memory mock database fallback.");
    this.connected = true;
    return this;
  }

  get readyState() {
    return 1; // Connected
  }

  // Mock methods for Edge Runtime compatibility
  async collection(name: string) {
    return {
      insertOne: async (doc: any) => ({ insertedId: 'mock-id' }),
      find: () => ({
        toArray: async () => [],
        sort: () => this,
        limit: () => this
      }),
      findOne: async () => null,
      updateOne: async () => ({ modifiedCount: 1 }),
      deleteOne: async () => ({ deletedCount: 1 }),
    };
  }

  async listCollections() {
    return {
      toArray: async () => []
    };
  }
}

let conn = (global as any)._mongoose;
if (!conn) {
  const preferMock = process.env.USE_MOCK_DB === 'true';
  if (preferMock) {
    conn = new MockDB().connect();
  } else if (mongoose && typeof mongoose.connect === 'function') {
    try {
      const opts = { autoIndex: true, maxPoolSize: 10, serverSelectionTimeoutMS: 5000 } as any;
      conn = mongoose.connect(uri, opts);
    } catch {
      conn = new MockDB().connect();
    }
    conn = Promise.resolve(conn).catch((err: any) => {
      console.warn('WARNING: mongoose.connect() rejected; falling back to MockDB:', err?.message || err);
      return new MockDB().connect();
    });
  } else {
    conn = new MockDB().connect();
  }
  (global as any)._mongoose = conn;
}
export const db = conn;

// Prefer real DB by default; allow explicit override via env if needed
export const isMockDB = process.env.USE_MOCK_DB === 'true' ? true : false;

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
