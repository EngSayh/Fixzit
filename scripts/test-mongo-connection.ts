/**
 * MongoDB Connection Test Suite
 * 
 * This script validates the MongoDB connection and database operations
 * Usage: tsx scripts/test-mongo-connection.ts
 */

import { connectToDatabase, getDatabase } from '@/lib/mongodb-unified';

async function testConnection() {

  try {

    // Test 1: Establish MongoDB connection
    await connectToDatabase();

    // Test 2: Get database handle
    const database = await getDatabase();

    // Test 3: Collection operations
    const testCollection = database.collection('test');

    // Insert test
    const insertResult = await testCollection.insertOne({
      name: 'Test Document',
      timestamp: new Date(),
      data: { value: 42 }
    });

    // Find test
    const findResult = await testCollection.find({ name: 'Test Document' }).toArray();

    // FindOne test
    const findOneResult = await testCollection.findOne({ name: 'Test Document' });

    // Update test
    const updateResult = await testCollection.updateOne(
      { name: 'Test Document' },
      { $set: { updated: new Date() } }
    );

    // Delete test
    const deleteResult = await testCollection.deleteOne({ name: 'Test Document' });

    // Test results summary
    const results = {
      success: true,
      connectionType: 'unified',
      operations: {
        insert: true,
        find: true,
        findOne: true,
        update: true,
        delete: true
      }
    };);

    return results;

  } catch (error) {
    console.error('❌ Connection test failed:', error);
    
    const results = {
      success: false,
      connectionType: 'unified',
      error: error instanceof Error ? error.message : String(error),
      operations: {
        insert: false,
        find: false,
        findOne: false,
        update: false,
        delete: false
      }
    };);

    return results;
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testConnection().then((results) => {
    process.exit(results.success ? 0 : 1);
  });
}

export { testConnection };
