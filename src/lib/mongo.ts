import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/fixzit";

let conn = (global as any)._mongoose as Promise<typeof mongoose> | undefined;
if (!conn) {
  conn = (global as any)._mongoose = mongoose.connect(uri, {
    autoIndex: true,
    maxPoolSize: 10,
  });
}
export const db = conn;

export async function connectDb() {
  return conn;
}

export const isMockDB = false;
