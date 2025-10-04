import 'dotenv/config';
import { MongoClient } from 'mongodb';
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('❌ MONGODB_URI not set'); process.exit(1); }
const c = new MongoClient(MONGODB_URI);
await c.connect();
const db = c.db('fixzit');
console.log('\n=== RECOUNTING ALL USERS ===\n');
const count = await db.collection('users').countDocuments();
console.log('TOTAL USER COUNT:', count);
console.log('\n--- ALL USERS ---');
const users = await db.collection('users').find({}).sort({email:1}).toArray();
users.forEach((u, i) => {
  console.log(`${(i+1).toString().padStart(2)}. ${u.email.padEnd(35)} | ${u.role.padEnd(20)} | ${u.name}`);
});
await c.close();
console.log(`\n✅ ACTUAL COUNT: ${count} users\n`);

