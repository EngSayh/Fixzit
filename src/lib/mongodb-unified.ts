import mongoose, { type Mongoose } from "mongoose";

declare global {
  var __mongoose:
    | { conn: Mongoose | null; promise: Promise<Mongoose> | null }
    | undefined;
}

const { MONGODB_URI } = process.env;
if (!MONGODB_URI) throw new Error("MONGODB_URI is missing");

export async function connectMongo(): Promise<Mongoose> {
  if (!global.__mongoose) global.__mongoose = { conn: null, promise: null };
  if (global.__mongoose.conn) return global.__mongoose.conn;

  if (!global.__mongoose.promise) {
    global.__mongoose.promise = mongoose.connect(MONGODB_URI as string, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
      appName: "Fixizit",
    });
  }
  global.__mongoose.conn = await global.__mongoose.promise;
  return global.__mongoose.conn!;
}
