#!/usr/bin/env node

/**
 * MIGRATION SCRIPT: Fix WorkOrder Index Conflict
 *
 * ISSUE: workOrderNumber_1 unique index contains duplicate null values
 * SOLUTION: Drop problematic index and create partial unique index
 *
 * Run with: node scripts/fix-workorder-index.js
 */

require("dotenv/config");
require("tsx/register");

const { connectToDatabase, disconnectFromDatabase } = require("../lib/mongodb-unified.ts");
const { COLLECTIONS, createIndexes } = require("../lib/db/collections.ts");

async function fixWorkOrderIndex() {
  console.log("🔧 Starting WorkOrder Index Migration...");

  try {
    // Connect to MongoDB using the shared unified connector
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    const collection = db.collection(COLLECTIONS.WORK_ORDERS);

    // Step 1: List existing indexes
    console.log("📋 Checking existing indexes...");
    const indexes = await collection.indexes();
    console.log(
      "Current indexes:",
      indexes.map((idx) => idx.name),
    );

    // Step 2: Drop legacy/problematic indexes so canonical org-scoped index can be recreated
    const legacyIndexes = [
      "workOrderNumber_1",
      "workorders_orgId_workOrderNumber_unique",
      "workOrderNumber_partial_unique",
    ];
    try {
      for (const name of legacyIndexes) {
        try {
          await collection.dropIndex(name);
          console.log(`✅ Dropped legacy index: ${name}`);
        } catch (error) {
          if (error.code === 27 || /index not found/i.test(error.message)) {
            console.log(`ℹ️ Index not found (already dropped): ${name}`);
          } else {
            console.log(`⚠️ Error dropping index ${name}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.log("⚠️ Error while dropping legacy indexes:", error.message);
    }

    // Step 3: Recreate canonical org-scoped unique index (matches createIndexes definition)
    console.log("🔨 Creating org-scoped unique index for workOrderNumber...");
    await collection.createIndex(
      { orgId: 1, workOrderNumber: 1 },
      {
        unique: true,
        background: true,
        name: "workorders_orgId_workOrderNumber_unique",
        partialFilterExpression: { orgId: { $exists: true }, workOrderNumber: { $type: "string" } },
      },
    );
    console.log("✅ Created index: workorders_orgId_workOrderNumber_unique");

    // Step 4: Run global index creation to ensure all canonical indexes are present
    console.log("🧭 Ensuring all canonical indexes via createIndexes()");
    await createIndexes();
    console.log("✅ Canonical indexes ensured");

    // Step 5: Verify the new index
    const newIndexes = await collection.indexes();
    const partialIndex = newIndexes.find(
      (idx) => idx.name === "workorders_orgId_workOrderNumber_unique",
    );
    if (partialIndex) {
      console.log("✅ Verification: New index created successfully");
      console.log("Index details:", JSON.stringify(partialIndex, null, 2));
    } else {
      console.log("❌ Verification failed: New index not found");
    }

    console.log("🎉 WorkOrder Index Migration completed successfully and aligned with STRICT v4.1");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    // Close connection
    try {
      await disconnectFromDatabase();
    } catch (err) {
      console.warn("⚠️ Failed to disconnect cleanly", err);
    }
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
