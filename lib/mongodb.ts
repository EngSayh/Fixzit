import { MongoClient, Db, MongoClientOptions } from 'mongodb';

// Lightweight in-memory fallback to avoid crashes when MONGODB_URI is not set
class MockCollection {
  private name: string;
  private store: any[] = [];
  constructor(name: string) { this.name = name; }
  async insertOne(doc: any) { const _id = `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`; this.store.push({ ...doc, _id }); return { insertedId: _id }; }
  find(_filter: any = {}) {
    const self = this;
    return {
      skip() { return this; },
      limit() { return this; },
      sort() { return this; },
      async toArray() { return [...self.store]; }
    } as any;
  }
  async findOne(filter: any) { 
    if (!filter || Object.keys(filter).length === 0) {
      return this.store[0] ?? null;
    }
    // Basic filter implementation, only handles top-level equality.
    return this.store.find(item => {
      return Object.keys(filter).every(key => item[key] === filter[key]);
    }) ?? null;
  }
  async countDocuments(_filter: any = {}) { return this.store.length; }
  async updateOne(_filter: any, _update: any) { return { modifiedCount: 1 }; }
}

class MockDb {
  private cols = new Map<string, MockCollection>();
  collection(name: string) { if (!this.cols.has(name)) this.cols.set(name, new MockCollection(name)); return this.cols.get(name)!; }
  async command(_cmd: any) { return { db: 'mock', collections: this.cols.size, objects: 0 }; }
  async listCollections() { return { toArray: async () => Array.from(this.cols.keys()).map(name => ({ name })) }; }
}

const uri = process.env.MONGODB_URI;
const useMock = !uri;

let clientPromise: Promise<any>;

declare global { var _mongoClientPromise: Promise<MongoClient> | undefined }

if (useMock) {
  const mock = { db: () => new MockDb() } as any;
  clientPromise = Promise.resolve(mock);
} else {
  const options: MongoClientOptions = {};
  let client: MongoClient;
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri as string, options);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise as Promise<MongoClient>;
  } else {
    client = new MongoClient(uri as string, options);
    clientPromise = client.connect();
  }
}

export default clientPromise;

// Helper to get database
export async function getDatabase(): Promise<Db> {
  const client: any = await clientPromise;
  return client.db();
}
