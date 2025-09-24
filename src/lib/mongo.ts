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
  if (mongoose) {
    try {
      conn = (global as any)._mongoose = mongoose.connect(uri, { autoIndex: true, maxPoolSize: 10 });
    } catch {
      conn = (global as any)._mongoose = new MockDB().connect();
    }
  } else {
    conn = (global as any)._mongoose = new MockDB().connect();
  }
}
export const db = conn;

// Prefer real DB by default; allow explicit override via env if needed
export const isMockDB = process.env.USE_MOCK_DB === 'true' ? true : false;
