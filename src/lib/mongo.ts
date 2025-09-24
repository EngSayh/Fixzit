import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || 'fixzit';

let client: MongoClient;
let db: Db;

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

export async function closeConnection() {
  if (client) {
    await client.close();
  }
}