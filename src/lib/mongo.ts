import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || 'fixzit';

let client: MongoClient;
let db: Db;

/**
 * Returns a singleton connected MongoDB Db instance, lazily creating and connecting a MongoClient on first call.
 *
 * Subsequent calls return the same Db. The returned promise rejects if establishing the client connection fails.
 *
 * @returns The connected MongoDB `Db` for the configured database.
 */
export async function getDb() {
  if (!client) {
    client = new MongoClient(uri, { 
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    await client.connect();
    db = client.db(dbName);
  }
  return db;
}

/**
 * Closes the global MongoDB client connection if one exists.
 *
 * Safe to call multiple times; if no client is connected this is a no-op.
 *
 * @returns A promise that resolves once the client has been closed.
 */
export async function closeConnection() {
  if (client) {
    await client.close();
  }
}