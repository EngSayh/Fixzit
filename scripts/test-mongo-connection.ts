/**
 * MongoDB Connection Test Suite
 * 
 * This script validates the MongoDB connection and database operations
 * Usage: tsx scripts/test-mongo-connection.ts
 */

import { connectToDatabase, getDatabase } from '@/lib/mongodb-unified';

async function testConnection() {
  console.log('🚀 MongoDB Connection Test Suite');
  console.log('================================\n');

  try {
    console.log('🔍 Testing MongoDB connection...');
    console.log('📊 Using unified MongoDB connection');

    // Test 1: Establish MongoDB connection
    await connectToDatabase();
    console.log('✅ Database connection established');

    // Test 2: Get database handle
    const database = await getDatabase();
    console.log('✅ Database handle retrieved');

    // Test 3: Collection operations
    const testCollection = database.collection('test');

    // Insert test
    const insertResult = await testCollection.insertOne({
      name: 'Test Document',
      timestamp: new Date(),
      data: { value: 42 }
    });
    console.log(`✅ Insert operation successful: ${insertResult.insertedId}`);

    // Find test
    const findResult = await testCollection.find({ name: 'Test Document' }).toArray();
    console.log(`✅ Find operation successful, found: ${findResult.length} documents`);

    // FindOne test
    const findOneResult = await testCollection.findOne({ name: 'Test Document' });
    console.log(`✅ FindOne operation successful: ${findOneResult ? 'Found document' : 'No document'}`);

    // Update test
    const updateResult = await testCollection.updateOne(
      { name: 'Test Document' },
      { $set: { updated: new Date() } }
    );
    console.log(`✅ Update operation successful: ${updateResult.modifiedCount} modified`);

    // Delete test
    const deleteResult = await testCollection.deleteOne({ name: 'Test Document' });
    console.log(`✅ Delete operation successful: ${deleteResult.deletedCount} deleted`);

    console.log('🎉 All database operations completed successfully!\n');

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
    };

    console.log('📋 Test Results:');
    console.log('================');
    console.log(JSON.stringify(results, null, 2));

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
    };

    console.log('\n📋 Test Results:');
    console.log('================');
    console.log(JSON.stringify(results, null, 2));

    return results;
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testConnection()
    .then((results) => {
      process.exit(results.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Fatal error during MongoDB connection test:', error);
      process.exit(1);
    });
}

export { testConnection };
