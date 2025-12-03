#!/usr/bin/env npx tsx
/**
 * Migration: Create QA Alerts Indexes
 * 
 * AUDIT-2025: Add indexes to qa_alerts collection for performance
 * 
 * This migration creates the following indexes:
 * - { timestamp: -1 } - For efficient reverse chronological queries
 * - { orgId: 1, timestamp: -1 } - For org-scoped queries (future multi-tenant)
 * - { timestamp: 1 } with TTL - Auto-delete after 30 days to bound storage
 * 
 * Run with: npx tsx scripts/migrations/2025-create-qa-alerts-indexes.ts
 * 
 * Options:
 *   --dry-run    Preview changes without applying them
 */

import { MongoClient } from "mongodb";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGODB_URI or MONGO_URI environment variable is required");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");

const INDEXES_TO_CREATE = [
  {
    collection: "qa_alerts",
    index: { timestamp: -1 },
    options: { name: "timestamp_desc", background: true },
  },
  {
    collection: "qa_alerts",
    index: { orgId: 1, timestamp: -1 },
    options: { name: "orgId_timestamp", background: true, sparse: true },
  },
  {
    // TTL index: Auto-delete qa_alerts after 30 days to bound storage growth
    collection: "qa_alerts",
    index: { timestamp: 1 },
    options: { 
      name: "qa_alerts_ttl_30d", 
      expireAfterSeconds: 30 * 24 * 60 * 60,  // 30 days
      background: true 
    },
  },
];

async function main() {
  console.log("🔧 QA Alerts Index Migration");
  console.log(DRY_RUN ? "📝 DRY RUN MODE - No changes will be applied\n" : "\n");

  const client = new MongoClient(MONGO_URI!);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();

    for (const { collection, index, options } of INDEXES_TO_CREATE) {
      console.log(`\n📊 Creating index on ${collection}:`, index);
      
      try {
        // Check if index already exists
        const existingIndexes = await db.collection(collection).listIndexes().toArray();
        const indexExists = existingIndexes.some(
          (existing) => existing.name === options.name
        );

        if (indexExists) {
          console.log(`   ⏭️  Index "${options.name}" already exists, skipping`);
          continue;
        }

        if (DRY_RUN) {
          console.log(`   📝 Would create index:`, { ...index, ...options });
        } else {
          await db.collection(collection).createIndex(index, options);
          console.log(`   ✅ Created index "${options.name}"`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to create index:`, error instanceof Error ? error.message : error);
      }
    }

    console.log("\n✅ Migration complete");
    if (DRY_RUN) {
      console.log("\n⚠️  This was a dry run. Run without --dry-run to apply changes.");
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
