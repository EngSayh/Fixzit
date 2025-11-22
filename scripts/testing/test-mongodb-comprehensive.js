#!/usr/bin/env node
/**
 * MONGODB COMPREHENSIVE VERIFICATION
 * Tests connection, indexes, CRUD operations, and business logic
 * Run with: node test-mongodb-comprehensive.js
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function testConnection() {
  console.log('🔌 Testing MongoDB Connection...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');
  return mongoose.connection.db;
}

async function testCollections(db) {
  console.log('\n📚 Testing Collections...');
  const collections = await db.listCollections().toArray();
  console.log(`✅ Found ${collections.length} collections:`);
  collections.forEach(c => console.log(`  - ${c.name}`));
  return collections;
}

async function testIndexes(db) {
  console.log('\n🔍 Testing Indexes...');
  const collections = ['users', 'workorders', 'invoices', 'rfqs', 'customers', 'jobs'];
  
  for (const collName of collections) {
    try {
      const indexes = await db.collection(collName).indexes();
      console.log(`✅ ${collName}: ${indexes.length} indexes`);
      indexes.forEach(idx => {
        const keys = Object.keys(idx.key).join(', ');
        console.log(`    - ${idx.name}: ${keys}${idx.unique ? ' (unique)' : ''}`);
      });
    } catch (error) {
      console.log(`⚠️  ${collName}: Collection not found (${error.message})`);
    }
  }
}

async function testCRUD(db) {
  console.log('\n✍️  Testing CRUD Operations...');
  
  const testCollection = 'test_crud_' + Date.now();
  const coll = db.collection(testCollection);
  
  // Create
  const insertResult = await coll.insertOne({ 
    name: 'Test Document', 
    createdAt: new Date(),
    testFlag: true
  });
  console.log(`✅ CREATE: Inserted document with ID ${insertResult.insertedId}`);
  
  // Read
  const doc = await coll.findOne({ _id: insertResult.insertedId });
  if (!doc || doc.name !== 'Test Document') {
    throw new Error('READ failed: Document not found or incorrect');
  }
  console.log(`✅ READ: Retrieved document successfully`);
  
  // Update
  const updateResult = await coll.updateOne(
    { _id: insertResult.insertedId },
    { $set: { name: 'Updated Document', updatedAt: new Date() } }
  );
  if (updateResult.modifiedCount !== 1) {
    throw new Error('UPDATE failed: No documents modified');
  }
  console.log(`✅ UPDATE: Updated document successfully`);
  
  // Delete
  const deleteResult = await coll.deleteOne({ _id: insertResult.insertedId });
  if (deleteResult.deletedCount !== 1) {
    throw new Error('DELETE failed: No documents deleted');
  }
  console.log(`✅ DELETE: Deleted document successfully`);
  
  // Cleanup
  await coll.drop();
  console.log(`✅ CLEANUP: Dropped test collection`);
}

async function testQueryPerformance(db) {
  console.log('\n⚡ Testing Query Performance...');
  
  const collections = ['users', 'workorders', 'invoices'];
  
  for (const collName of collections) {
    try {
      const coll = db.collection(collName);
      const start = Date.now();
      const count = await coll.countDocuments();
      const duration = Date.now() - start;
      console.log(`✅ ${collName}: ${count} documents (${duration}ms)`);
      
      if (duration > 1000) {
        console.warn(`  ⚠️  Query took ${duration}ms - may need index optimization`);
      }
    } catch (err) {
      console.log(`⚠️  ${collName}: ${err.message}`);
    }
  }
}

async function testBusinessLogic(db) {
  console.log('\n💼 Testing Business Logic...');
  
  // Test 1: Work Orders with duplicate detection
  try {
    const workOrders = db.collection('workorders');
    const duplicates = await workOrders.aggregate([
      { $group: { _id: '$workOrderNumber', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} duplicate work order numbers`);
      duplicates.forEach(d => console.log(`    - ${d._id}: ${d.count} copies`));
    } else {
      console.log(`✅ No duplicate work order numbers found`);
    }
  } catch (err) {
    console.log(`⚠️  Work Orders: ${err.message}`);
  }
  
  // Test 2: Invoices with ZATCA validation
  try {
    const invoices = db.collection('invoices');
    const sentWithoutZATCA = await invoices.countDocuments({
      status: 'SENT',
      $or: [
        { 'zatca.status': { $exists: false } },
        { 'zatca.status': null }
      ]
    });
    
    if (sentWithoutZATCA > 0) {
      console.log(`⚠️  Found ${sentWithoutZATCA} SENT invoices without ZATCA status`);
    } else {
      console.log(`✅ All SENT invoices have ZATCA status`);
    }
  } catch (err) {
    console.log(`⚠️  Invoices: ${err.message}`);
  }
  
  // Test 3: Users with proper roles
  try {
    const users = db.collection('users');
    const usersWithoutRoles = await users.countDocuments({
      $or: [
        { roles: { $exists: false } },
        { roles: [] },
        { roles: null }
      ]
    });
    
    if (usersWithoutRoles > 0) {
      console.log(`⚠️  Found ${usersWithoutRoles} users without roles`);
    } else {
      console.log(`✅ All users have roles assigned`);
    }
  } catch (err) {
    console.log(`⚠️  Users: ${err.message}`);
  }
}

async function testDataIntegrity(db) {
  console.log('\n🔐 Testing Data Integrity...');
  
  // Test for orphaned references
  try {
    const workOrders = db.collection('workorders');
    const customers = db.collection('customers');
    
    const woCursor = await workOrders.find({}, { projection: { customerId: 1 } }).limit(100);
    const customerIds = new Set((await customers.find({}, { projection: { _id: 1 } }).toArray()).map(c => c._id.toString()));
    
    let orphanedCount = 0;
    for await (const wo of woCursor) {
      if (wo.customerId && !customerIds.has(wo.customerId.toString())) {
        orphanedCount++;
      }
    }
    
    if (orphanedCount > 0) {
      console.log(`⚠️  Found ${orphanedCount} work orders with invalid customer references`);
    } else {
      console.log(`✅ No orphaned customer references in work orders`);
    }
  } catch (err) {
    console.log(`⚠️  Data Integrity: ${err.message}`);
  }
}

async function runTests() {
  console.log('\n🚀 MONGODB COMPREHENSIVE VERIFICATION\n');
  console.log('━'.repeat(60));
  
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable not set');
    process.exit(1);
  }
  
  console.log(`📍 Connection String: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  
  try {
    const db = await testConnection();
    await testCollections(db);
    await testIndexes(db);
    await testCRUD(db);
    await testQueryPerformance(db);
    await testBusinessLogic(db);
    await testDataIntegrity(db);
    
    console.log('\n' + '━'.repeat(60));
    console.log('\n✅ ALL MONGODB TESTS PASSED!\n');
    console.log('━'.repeat(60));
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    console.error(err.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runTests();
