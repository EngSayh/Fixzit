import 'dotenv/config';
import { MongoClient } from 'mongodb';
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('❌ MONGODB_URI not set'); process.exit(1); }
const c = new MongoClient(MONGODB_URI);
await c.connect();
const db = c.db('fixzit');
console.log('\n=== CHECKING ALL USER STATES ===\n');
const total = await db.collection('users').countDocuments();
const active = await db.collection('users').countDocuments({isActive: true});
const inactive = await db.collection('users').countDocuments({isActive: false});
const noStatus = await db.collection('users').countDocuments({isActive: {$exists: false}});
console.log(`Total users: ${total}`);
console.log(`  Active: ${active}`);
console.log(`  Inactive: ${inactive}`);
console.log(`  No status field: ${noStatus}`);
console.log('\nAll users (including inactive):');
const users = await db.collection('users').find({}).sort({email:1}).toArray();
users.forEach((u, i) => {
  const status = u.isActive === false ? '❌ INACTIVE' : '✅ ACTIVE';
  console.log(`${(i+1).toString().padStart(2)}. ${status} | ${u.email.padEnd(35)} | ${u.role}`);
});
await c.close();
console.log(`\n📊 CONFIRMED: ${total} total users in fixzit database\n`);

