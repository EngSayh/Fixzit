import mongoose, { type Connection } from 'mongoose';
import { db as globalConn } from '@/lib/mongo';

let connection: Connection | null = null;

export async function dbConnect() {
  if (connection) return connection;
  // Respect configured db name when URI does not include a path
  const conn = await globalConn;
  const dbName = process.env.MONGODB_DB;
  if (dbName && (conn as any).connection) {
    connection = (conn as any).connection.useDb(dbName, { useCache: true });
  } else {
    connection = (conn as any).connection;
  }
  return connection;
}

export function getMongoose() {
  if (!connection) {
    throw new Error('Mongoose not connected. Call dbConnect() first.');
  }
  return connection;
}



