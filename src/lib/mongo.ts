import mongoose from 'mongoose';

const isProd = process.env.NODE_ENV === "production";
const uriFromEnv = process.env.MONGODB_URI;
if (!uriFromEnv && isProd) {
  throw new Error("MONGODB_URI must be set in production");
}
const uri = uriFromEnv ?? "mongodb://localhost:27017/fixzit";

// Singleton connection cache
type Cached = {
  conn?: typeof mongoose;
  promise?: Promise<typeof mongoose>;
};
const cached: Cached = (global as any)._mongooseCache || ((global as any)._mongooseCache = {});

function createConnection(): Promise<typeof mongoose> {
  const dbName = process.env.MONGODB_DB;
  return mongoose.connect(uri, {
    autoIndex: true,
    maxPoolSize: 10,
    ...(dbName ? { dbName } : {}),
  });
}

let conn: Promise<typeof mongoose> | undefined = cached.promise;
if (!conn) {
  cached.promise = createConnection();
  conn = cached.promise;
}

export async function connectMongo(): Promise<typeof mongoose | null> {
  if (process.env.USE_MOCK_DB === 'true') {
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

export const db = conn;
export const isMockDB = process.env.USE_MOCK_DB === 'true' || !uri;

export async function getNativeDb(): Promise<any> {
  if (isMockDB) {
    return await db;
  }
  const m: any = await db;
  const connection = m?.connection || mongoose.connection;
  if (!connection || !connection.db) {
    throw new Error('Mongoose connection not ready');
  }
  return connection.db;
}

// Alias for compatibility with older code
export const connectDb = connectMongo;
