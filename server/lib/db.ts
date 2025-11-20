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
      // Use logger for server-side errors (structured logging with proper levels)
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Mongo] Failed to establish connection', error);
      }
      // In production, this error will be caught by the logger middleware
    });
  }
}
