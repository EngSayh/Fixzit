import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI?.trim();
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

async function createConnection() {
  if (!uri) {
    throw new Error('MONGODB_URI is required to establish a MongoDB connection.');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  mongoose.set('strictQuery', true);

  return mongoose.connect(uri, {
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

export const db = connectMongo();

export const isMockDB = shouldUseMock;
