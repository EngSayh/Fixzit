import { MongoClient, Db, MongoClientOptions } from 'mongodb';

// Do not throw at import time; defer validation until first use to avoid build-time crashes
const uri = process.env.MONGODB_URI || '';
const options: MongoClientOptions = {};

let client: MongoClient | undefined;
let clientPromise: Promise<MongoClient> | undefined;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (uri && process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else if (uri) {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise as Promise<MongoClient> | undefined;

// Helper to get database
export async function getDatabase(): Promise<Db> {
  if (!clientPromise) {
    if (!uri) throw new Error('MONGODB_URI is not configured');
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
  const cli = await clientPromise;
  return cli.db();
}
