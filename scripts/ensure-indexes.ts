#!/usr/bin/env node
/**
 * Script to ensure all database indexes are created
 * Run this after deployment or when database schema changes
 *
 * Usage: tsx scripts/ensure-indexes.ts
 */

import { ensureCoreIndexes } from "../lib/db/index";
import { connectToDatabase } from "../lib/mongodb-unified";

async function main() {
  console.log("🚀 Starting index creation process...\n");

  try {
    // Ensure connection
    await connectToDatabase();
    console.log("✅ Connected to database\n");

    // Create indexes
    await ensureCoreIndexes();
    console.log("\n✅ All indexes created successfully!");

    // Exit successfully
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error creating indexes:", error);
    process.exit(1);
  }
}

main();
