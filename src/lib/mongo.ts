// MongoDB connection utility - Server-side only with mock fallback
// This file should only be used on the server side to avoid client-side issues
import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || 'fixzit';

let client: MongoClient;
let db: Db;

// Check if we're using mock database
export const isMockDB = process.env.NODE_ENV === 'development' || !uri;

// Mock database for development when MongoDB is not available
const mockDb = {
  collection: (name: string) => ({
    find: (query?: any) => ({ toArray: async () => [] }),
    findOne: (query?: any) => ({ _id: 'mock-id', ...query }),
    insertOne: (doc: any) => ({ insertedId: 'mock-id' }),
    updateOne: (filter: any, update: any) => ({ matchedCount: 1, modifiedCount: 1 }),
    deleteOne: (filter: any) => ({ deletedCount: 1 }),
    aggregate: (pipeline: any[]) => ({ toArray: async () => [] }),
    watch: (pipeline: any[], options?: any) => ({
      on: (event: string, callback: Function) => {},
      close: () => {}
    })
  })
};

export async function getDb() {
  // In development, use mock database to avoid MongoDB client-side issues
  if (isMockDB) {
    return mockDb as any;
  }

  if (!client) {
    client = new MongoClient(uri, {
      maxPoolSize: 10,
    });
    await client.connect();
    db = client.db(dbName);
  }
  return db;
}

// Export db for backward compatibility with existing API routes
export { db };