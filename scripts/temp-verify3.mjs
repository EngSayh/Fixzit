import 'dotenv/config';
import { MongoClient } from 'mongodb';
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('❌ MONGODB_URI not set'); process.exit(1); }
const c = new MongoClient(MONGODB_URI);
await c.connect();
const admin = c.db().admin();
console.log('\n=== CHECKING ALL DATABASES ===\n');
const dbs = await admin.listDatabases();
for (const dbInfo of dbs.databases) {
  const db = c.db(dbInfo.name);
  const collections = await db.listCollections().toArray();
  const userCollections = collections.filter(col => col.name.toLowerCase().includes('user'));
  if (userCollections.length > 0) {
    console.log(`\n📁 Database: ${dbInfo.name}`);
    for (const col of userCollections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`   - ${col.name}: ${count} documents`);
    }
  }
}
await c.close();
console.log('\n✅ Search complete\n');

