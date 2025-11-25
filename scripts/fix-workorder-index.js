#!/usr/bin/env node

/**
 * MIGRATION SCRIPT: Fix WorkOrder Index Conflict
 *
 * ISSUE: workOrderNumber_1 unique index contains duplicate null values
 * SOLUTION: Drop problematic index and create partial unique index
 *
 * Run with: node scripts/fix-workorder-index.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

async function fixWorkOrderIndex() {
  console.log("🔧 Starting WorkOrder Index Migration...");

  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is required");
    }

    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("workorders");

    // Step 1: List existing indexes
    console.log("📋 Checking existing indexes...");
    const indexes = await collection.indexes();
    console.log(
      "Current indexes:",
      indexes.map((idx) => idx.name),
    );

    // Step 2: Drop problematic workOrderNumber_1 index if it exists
    try {
      await collection.dropIndex("workOrderNumber_1");
      console.log("✅ Dropped problematic workOrderNumber_1 index");
    } catch (error) {
      if (error.code === 27) {
        // Index not found
        console.log("ℹ️ workOrderNumber_1 index not found (already dropped)");
      } else {
        console.log("⚠️ Error dropping index:", error.message);
      }
    }

    // Step 3: Create partial unique index for workOrderNumber
    // This excludes null and undefined values from uniqueness constraint
    console.log("🔨 Creating partial unique index...");
    await collection.createIndex(
      { workOrderNumber: 1 },
      {
        unique: true,
        partialFilterExpression: {
          workOrderNumber: {
            $type: "string",
          },
        },
        name: "workOrderNumber_partial_unique",
      },
    );
    console.log(
      "✅ Created partial unique index: workOrderNumber_partial_unique",
    );

    // Step 4: Verify the new index
    const newIndexes = await collection.indexes();
    const partialIndex = newIndexes.find(
      (idx) => idx.name === "workOrderNumber_partial_unique",
    );
    if (partialIndex) {
      console.log("✅ Verification: New index created successfully");
      console.log("Index details:", JSON.stringify(partialIndex, null, 2));
    } else {
      console.log("❌ Verification failed: New index not found");
    }

    // Step 5: Clean up any duplicate null workOrderNumbers
    console.log("🧹 Cleaning up documents with null workOrderNumber...");
    const result = await collection.updateMany(
      { workOrderNumber: null },
      { $unset: { workOrderNumber: "" } },
    );
    console.log(
      `✅ Cleaned up ${result.modifiedCount} documents with null workOrderNumber`,
    );

    console.log("🎉 WorkOrder Index Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Run migration if called directly
if (require.main === module) {
  fixWorkOrderIndex()
    .then(() => {
      console.log("✨ Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration script failed:", error);
      process.exit(1);
    });
}

module.exports = fixWorkOrderIndex;
