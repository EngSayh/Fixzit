import mongoose from 'mongoose';
import { db as globalConn } from '@/src/lib/mongo';

let connection: typeof mongoose | null = null;

export async function dbConnect() {
  if (connection) return connection;
  // Respect configured db name when URI does not include a path
  const conn = await globalConn;
  const dbName = process.env.MONGODB_DB;
  if (dbName && conn.connection) {
    conn.connection.useDb(dbName);
  }
  connection = conn;
  return connection;
}

export function getMongoose() {
  if (!connection) {
    throw new Error('Mongoose not connected. Call dbConnect() first.');
  }
  return connection;
}


