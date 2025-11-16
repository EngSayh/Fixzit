import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb-unified';

export async function getDb() {
  await connectToDatabase();
  if (!mongoose.connection.db) {
    throw new Error('Database connection not established');
  }
  return mongoose.connection.db;
}

export function ensureMongoConnection(): void {
  if (mongoose.connection.readyState === 0) {
    void connectToDatabase().catch((error) => {
      console.error('[Mongo] Failed to establish connection', error);
    });
  }
}
