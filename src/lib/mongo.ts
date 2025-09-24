import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

// Enforce real database usage in all environments. Do not allow silent mock fallback.
if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: CachedConnection | undefined;
}

let cached = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function db() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Allow `await db;` (thenable) and `await db()` both to work across codebase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(db as any).then = (resolve: (v: unknown)=>void, reject: (e: unknown)=>void) => {
  db().then(resolve, reject);
};

// Explicit toggle only. Default is real DB.
export const isMockDB = process.env.USE_MOCK_DB === 'true';

// Alias for compatibility
export const dbConnect = db;

export default db;

// Convenience getter used by some legacy routes
export async function getDb() {
  return db();
}