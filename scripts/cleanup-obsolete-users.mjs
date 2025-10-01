import { MongoClient } from 'mongodb';
const c = new MongoClient('mongodb+srv://fixzitadmin:FixzitAdmin2024@fixzit.vgfiiff.mongodb.net/fixzit');
await c.connect();
const db = c.db('fixzit');
console.log('\n🗑️  Removing obsolete user roles...\n');
const obsoleteRoles = ['employee', 'guest', 'management', 'vendor'];
for (const role of obsoleteRoles) {
  const result = await db.collection('users').deleteMany({ role });
  console.log(`❌ Deleted ${result.deletedCount} user(s) with role: ${role}`);
}
const finalCount = await db.collection('users').countDocuments();
console.log(`\n✅ Final user count: ${finalCount}`);
await c.close();
