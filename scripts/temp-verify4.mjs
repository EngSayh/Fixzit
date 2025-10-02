import 'dotenv/config';
import { MongoClient } from 'mongodb';
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('❌ MONGODB_URI not set'); process.exit(1); }
const c = new MongoClient(MONGODB_URI);
await c.connect();
const db = c.db('fixzit');
console.log('\n=== DETAILED USER AND ORG ANALYSIS ===\n');
const orgCount = await db.collection('organizations').countDocuments();
console.log(`Organizations: ${orgCount}`);
const orgs = await db.collection('organizations').find({}).toArray();
orgs.forEach(org => console.log(`  - ${org.code}: ${org.nameEn}`));
console.log('');
const userCount = await db.collection('users').countDocuments();
console.log(`Users: ${userCount}`);
const users = await db.collection('users').find({}).toArray();
const orgMap = {};
orgs.forEach(o => orgMap[o._id.toString()] = o.code);
console.log('\nUsers by Organization:');
users.forEach(u => {
  const orgCode = orgMap[u.orgId.toString()] || 'UNKNOWN';
  console.log(`  [${orgCode}] ${u.email} - ${u.role}`);
});
console.log(`\n📊 TOTAL: ${userCount} users across ${orgCount} organizations`);
await c.close();

