import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI not defined');
}

const MONGODB_URI = process.env.MONGODB_URI;

declare global {
  var __mongooseConn: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

const g = global as typeof globalThis;

if (!g.__mongooseConn) {
  g.__mongooseConn = { conn: null, promise: null };
}

export async function connectMongo() {
  if (g.__mongooseConn!.conn) {
    return g.__mongooseConn!.conn;
  }

  if (!g.__mongooseConn!.promise) {
    g.__mongooseConn!.promise = mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
    }).then((m) => m);
  }

  g.__mongooseConn!.conn = await g.__mongooseConn!.promise;
  return g.__mongooseConn!.conn;
}
