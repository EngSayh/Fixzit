import 'dotenv/config';
import { MongoClient } from 'mongodb';
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('❌ MONGODB_URI not set'); process.exit(1); }
const c = new MongoClient(MONGODB_URI);
await c.connect();
const db = c.db('fixzit');
console.log('🗑️  Dropping all users...');
await db.collection('users').deleteMany({});
await c.close();
console.log('✅ Users dropped');

