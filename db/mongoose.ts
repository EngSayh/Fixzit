import mongoose, { type Connection } from "mongoose";
import { db as globalConn } from "@/lib/mongo";

let connection: Connection | null = null;

export async function dbConnect(): Promise<Connection> {
  if (connection) return connection;

  // Use mongoose.connection which is the actual Connection object
  await globalConn; // Ensure MongoDB is connected
  connection = mongoose.connection;

  // Respect configured db name when URI does not include a path
  const dbName = process.env.MONGODB_DB;
  if (dbName && connection.name !== dbName) {
    connection = connection.useDb(dbName, { useCache: true });
  }

  return connection;
}

export function getMongoose(): Connection {
  if (!connection) {
    throw new Error("Mongoose not connected. Call dbConnect() first.");
  }
  return connection;
}
