import mongoose from 'mongoose';
import type { Db } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';

export async function getDb(): Promise<Db> {
  await connectToDatabase();
  if (!mongoose.connection.db) {
    throw new Error('Database connection not established');
  }
  // Cast needed due to mongoose bundling its own mongodb types
  return mongoose.connection.db as unknown as Db;
}

export function ensureMongoConnection(): void {
  if (mongoose.connection.readyState === 0) {
    void connectToDatabase().catch((error) => {
      // Use logger for server-side errors (structured logging with proper levels)
      if (process.env.NODE_ENV !== 'production') {
        logger.error('[Mongo] Failed to establish connection', { error });
      }
      // In production, this error will be caught by the logger middleware
    });
  }
}
