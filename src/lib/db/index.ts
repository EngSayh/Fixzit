import { MongoClient, Db, Collection, Document } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || 'fixzit';

if (!uri) throw new Error('MONGODB_URI is required');

let clientPromise: Promise<MongoClient>;
declare global {
  // eslint-disable-next-line no-var
  var _fixzitMongoClient: Promise<MongoClient> | undefined;
}
if (!global._fixzitMongoClient) {
  const client = new MongoClient(uri, { maxPoolSize: 10 });
  global._fixzitMongoClient = client.connect();
}
clientPromise = global._fixzitMongoClient;

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

export async function collection<T extends Document>(name: string): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

export function withOrg<T extends Document>(query: Partial<T>, orgId?: string): Partial<T> {
  return orgId ? { ...query, org_id: orgId } : query;
}

export async function ensureCoreIndexes() {
  const db = await getDb();
  await db.collection('users').createIndex({ org_id: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $exists: true } } });
  await db.collection('properties').createIndex({ org_id: 1, owner_user_id: 1 });
  await db.collection('units').createIndex({ property_id: 1 });
  await db.collection('work_orders').createIndex({ org_id: 1, property_id: 1, status: 1, priority: 1 });
  await db.collection('quotations').createIndex({ work_order_id: 1, status: 1 });
  await db.collection('financial_transactions').createIndex({ org_id: 1, property_id: 1, type: 1, date: -1 });
}
