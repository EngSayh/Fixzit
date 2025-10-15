#!/usr/bin/env node

/**
 * MIGRATION SCRIPT: Fix WorkOrder Index Conflict
 * 
 * ISSUE: workOrderNumber_1 unique index contains duplicate null values
 * SOLUTION: Drop problematic index and create partial unique index
 * 
 * Run with: node scripts/fix-workorder-index.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixWorkOrderIndex() {

  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const db = mongoose.connection.db;
    const collection = db.collection('workorders');
    
    // Step 1: List existing indexes

    const indexes = await collection.indexes(););
    
    // Step 2: Drop problematic workOrderNumber_1 index if it exists
    try {
      await collection.dropIndex('workOrderNumber_1');

    } catch (error) {
      if (error.code === 27) { // Index not found');
      } else {

      }
    }
    
    // Step 3: Create partial unique index for workOrderNumber
    // This excludes null and undefined values from uniqueness constraint

    await collection.createIndex(
      { workOrderNumber: 1 }, 
      { 
        unique: true, 
        partialFilterExpression: { 
          workOrderNumber: { 
            $type: "string"
          } 
        },
        name: 'workOrderNumber_partial_unique'
      }
    );

    // Step 4: Verify the new index
    const newIndexes = await collection.indexes();
    const partialIndex = newIndexes.find(idx => idx.name === 'workOrderNumber_partial_unique');
    if (partialIndex) {);
    } else {

    }
    
    // Step 5: Clean up any duplicate null workOrderNumbers

    const result = await collection.updateMany(
      { workOrderNumber: null },
      { $unset: { workOrderNumber: "" } }
    );

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    await mongoose.connection.close();

  }
}

// Run migration if called directly
if (require.main === module) {
  fixWorkOrderIndex().then(() => {

    process.exit(0);
  }).catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = fixWorkOrderIndex;