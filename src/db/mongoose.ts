import mongoose from 'mongoose';
import { db as globalConn } from '@/src/lib/mongo';

let connection: typeof mongoose | null = null;

export async function dbConnect() {
  if (connection) return connection;
  connection = await globalConn;
  return connection;
}

export function getMongoose() {
  if (!connection) {
    throw new Error('Mongoose not connected. Call dbConnect() first.');
  }
  return connection;
}


