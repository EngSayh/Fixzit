import { MongoClient } from 'mongodb';
const c = new MongoClient('mongodb+srv://fixzitadmin:FixzitAdmin2024@fixzit.vgfiiff.mongodb.net/fixzit');
await c.connect();
const db = c.db('fixzit');
console.log('🗑️  Dropping all users...');
await db.collection('users').deleteMany({});
await c.close();
console.log('✅ Users dropped');
