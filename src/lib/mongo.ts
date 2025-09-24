// Conditional import to avoid Edge Runtime issues
let mongoose: any;
try {
  mongoose = require("mongoose");
} catch {
  mongoose = null;
}

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/fixzit";
const dbName = process.env.MONGODB_DB || "fixzit";
const useMock = String(process.env.USE_MOCK_DB || "false").toLowerCase() === "true";

// Explicit Mock database (only when USE_MOCK_DB=true)
class MockDB {
  private connected: boolean = false;

  async connect() {
    if (this.connected) return this;
    console.warn("🔄 Using mock database (USE_MOCK_DB=true)");
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
  if (useMock) {
    conn = (global as any)._mongoose = new MockDB();
  } else {
    if (!mongoose) {
      throw new Error("Mongoose is not available, and USE_MOCK_DB is false. Install mongoose or enable USE_MOCK_DB=true.");
    }
    conn = (global as any)._mongoose = mongoose.connect(uri, {
      dbName,
      autoIndex: true,
      maxPoolSize: 10,
    });
  }
}
export const db = conn;

// Export isMockDB for use in models (driven solely by USE_MOCK_DB)
export const isMockDB = useMock;
