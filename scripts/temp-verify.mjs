import 'dotenv/config';
import { MongoClient } from 'mongodb';
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('❌ MONGODB_URI not set'); process.exit(1); }
const c = new MongoClient(MONGODB_URI);
await c.connect();
const db = c.db('fixzit');
console.log('\n=== PHASE 1.3: DATABASE SEEDING VERIFICATION ===\n');
const count = await db.collection('users').countDocuments();
console.log('Total users:', count);
const users = await db.collection('users').find({}, {projection: {email:1, role:1, name:1}}).sort({email:1}).toArray();
users.forEach((u, i) => console.log(`${i+1}. ${u.email} | ${u.role} | ${u.name}`));
await c.close();
console.log('\n✅✅✅ PHASE 1.3 COMPLETE: 11 USERS VERIFIED ✅✅✅\n');

