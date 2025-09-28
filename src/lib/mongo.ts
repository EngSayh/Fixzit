import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB || "fixzit";
const shouldUseMock = process.env.USE_MOCK_DB === 'true';

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache: MongooseCache | undefined;
}

const cached = globalThis.__mongooseCache ?? (globalThis.__mongooseCache = { conn: null, promise: null });

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

async function createConnection() {
  if (!uri) {
    throw new Error('MONGODB_URI is required to establish a MongoDB connection.');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  mongoose.set('strictQuery', true);

  return mongoose.connect(uri, {
    dbName,
    autoIndex: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5_000,
    socketTimeoutMS: 45_000,
  });
}

export async function connectMongo(): Promise<typeof mongoose | null> {
  if (shouldUseMock) {
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = createConnection();
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// Legacy compatibility for existing code
let conn = (global as any)._mongoose;
if (!conn) {
  if (shouldUseMock || !uri) {
    console.warn("⚠️ Mock DB mode — using in-memory stub. Not for production.");
    conn = (global as any)._mongoose = new MockDB().connect();
  } else {
    conn = (global as any)._mongoose = connectMongo();
  }
}

export const db = conn;
export const isMockDB = shouldUseMock || !uri;

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
