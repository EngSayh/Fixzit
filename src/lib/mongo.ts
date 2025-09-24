// Conditional import to avoid Edge Runtime issues
let mongoose: any;
try {
  mongoose = require("mongoose");
} catch {
  // Mongoose not available in Edge Runtime - will use mock
  mongoose = null;
}

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/fixzit";

// Mock database for development when MongoDB is not available
class MockDB {
  private connected: boolean = false;

  async connect() {
    if (this.connected) return this;
    console.log("🔄 Using mock database (MongoDB not available)");
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
  const useMock = String(process.env.USE_MOCK_DB || '').toLowerCase() === 'true';
  if (useMock) {
    console.log("📦 Using mock database (USE_MOCK_DB=true)");
    conn = (global as any)._mongoose = new MockDB();
  } else if (mongoose) {
    conn = (global as any)._mongoose = mongoose.connect(uri, {
      autoIndex: true,
      maxPoolSize: 10,
    });
  } else {
    console.log("📦 Using mock database (Mongoose unavailable in this runtime)");
    conn = (global as any)._mongoose = new MockDB();
  }
}
export const db = conn;

// Export isMockDB for use in models
export const isMockDB = String(process.env.USE_MOCK_DB || '').toLowerCase() === 'true';
