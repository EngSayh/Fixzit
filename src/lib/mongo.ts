import mongoose from "mongoose";

const isProd = process.env.NODE_ENV === "production";
const uriFromEnv = process.env.MONGODB_URI;
if (!uriFromEnv && isProd) {
  throw new Error("MONGODB_URI must be set in production");
}
const uri = uriFromEnv ?? "mongodb://localhost:27017/fixzit";

let conn = (global as any)._mongoose as Promise<typeof mongoose> | undefined;
if (!conn) {
  const dbName = process.env.MONGODB_DB;
  conn = (global as any)._mongoose = mongoose.connect(uri, {
    autoIndex: true,
    maxPoolSize: 10,
    ...(dbName ? { dbName } : {}),
  });
}
export const db = conn;

export async function connectDb() {
  return conn;
}

export const isMockDB = false;
