#!/usr/bin/env node
/**
 * MONGODB COMPREHENSIVE VERIFICATION
 * Tests connection, indexes, CRUD operations, and business logic
 * Run with: node test-mongodb-comprehensive.js
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function testConnection() {

  await mongoose.connect(MONGODB_URI);

  return mongoose.connection.db;
}

async function testCollections(db) {

  const collections = await db.listCollections().toArray();

  collections.forEach(c =>);
  return collections;
}

async function testIndexes(db) {

  const collections = ['users', 'workorders', 'invoices', 'rfqs', 'customers', 'jobs'];
  
  for (const collName of collections) {
    try {
      const indexes = await db.collection(collName).indexes();

      indexes.forEach(idx => {
        const keys = Object.keys(idx.key).join(', ');' : ''}`);
      });
    } catch (err) {

    }
  }
}

async function testCRUD(db) {

  const testCollection = 'test_crud_' + Date.now();
  const coll = db.collection(testCollection);
  
  // Create
  const insertResult = await coll.insertOne({ 
    name: 'Test Document', 
    createdAt: new Date(),
    testFlag: true
  });

  // Read
  const doc = await coll.findOne({ _id: insertResult.insertedId });
  if (!doc || doc.name !== 'Test Document') {
    throw new Error('READ failed: Document not found or incorrect');
  }

  // Update
  const updateResult = await coll.updateOne(
    { _id: insertResult.insertedId },
    { $set: { name: 'Updated Document', updatedAt: new Date() } }
  );
  if (updateResult.modifiedCount !== 1) {
    throw new Error('UPDATE failed: No documents modified');
  }

  // Delete
  const deleteResult = await coll.deleteOne({ _id: insertResult.insertedId });
  if (deleteResult.deletedCount !== 1) {
    throw new Error('DELETE failed: No documents deleted');
  }

  // Cleanup
  await coll.drop();

}

async function testQueryPerformance(db) {

  const collections = ['users', 'workorders', 'invoices'];
  
  for (const collName of collections) {
    try {
      const coll = db.collection(collName);
      const start = Date.now();
      const count = await coll.countDocuments();
      const duration = Date.now() - start;`);
      
      if (duration > 1000) {

      }
    } catch (err) {

    }
  }
}

async function testBusinessLogic(db) {

  // Test 1: Work Orders with duplicate detection
  try {
    const workOrders = db.collection('workorders');
    const duplicates = await workOrders.aggregate([
      { $group: { _id: '$workOrderNumber', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    if (duplicates.length > 0) {

      duplicates.forEach(d =>);
    } else {

    }
  } catch (err) {

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

    } else {

    }
  } catch (err) {

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

    } else {

    }
  } catch (err) {

  }
}

async function testDataIntegrity(db) {

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

    } else {

    }
  } catch (err) {

  }
}

async function runTests() {);
  
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable not set');
    process.exit(1);
  }}`);
  
  try {
    const db = await testConnection();
    await testCollections(db);
    await testIndexes(db);
    await testCRUD(db);
    await testQueryPerformance(db);
    await testBusinessLogic(db);
    await testDataIntegrity(db);););
    
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
