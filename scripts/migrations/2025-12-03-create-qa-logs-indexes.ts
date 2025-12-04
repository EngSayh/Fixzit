#!/usr/bin/env npx tsx
/**
 * Migration: Create QA Logs Indexes
 * 
 * AUDIT-2025-12-03: Add indexes to qa_logs collection for multi-tenant isolation
 * 
 * This migration creates the following indexes:
 * - { timestamp: -1 } - For efficient reverse chronological queries
 * - { orgId: 1, timestamp: -1 } - For org-scoped queries (STRICT v4 tenant isolation)
 * - { orgId: 1, event: 1, timestamp: -1 } - For event-specific org-scoped queries
 * - { timestamp: 1 } with TTL - Auto-delete after 90 days to bound storage
 * 
 * CONTEXT:
 * Previously qa_logs had no orgId field and allowed anonymous writes.
 * As of this migration, the qa/log endpoint requires SUPER_ADMIN auth and
 * includes orgId/userId on all new writes. Historical documents without
 * orgId will be excluded from org-scoped queries.
 * 
 * Run with: npx tsx scripts/migrations/2025-12-03-create-qa-logs-indexes.ts
 * 
 * Options:
 *   --dry-run    Preview changes without applying them
 */

import "dotenv/config";
import { getDatabase, disconnectFromDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";

const DRY_RUN = process.argv.includes("--dry-run");

const INDEXES_TO_CREATE = [
  {
    collection: COLLECTIONS.QA_LOGS,
    index: { timestamp: -1 },
    options: { name: "timestamp_desc", background: true },
  },
  {
    collection: COLLECTIONS.QA_LOGS,
    index: { orgId: 1, timestamp: -1 },
    options: { 
      name: "orgId_timestamp", 
      background: true, 
      sparse: true,  // Exclude documents without orgId
    },
  },
  {
    collection: COLLECTIONS.QA_LOGS,
    index: { orgId: 1, event: 1, timestamp: -1 },
    options: { 
      name: "orgId_event_timestamp", 
      background: true, 
      sparse: true,  // Exclude documents without orgId
    },
  },
  {
    // TTL index: Auto-delete qa_logs after 90 days to bound storage growth
    collection: COLLECTIONS.QA_LOGS,
    index: { timestamp: 1 },
    options: { 
      name: "qa_logs_ttl_90d", 
      expireAfterSeconds: 90 * 24 * 60 * 60,  // 90 days
      background: true 
    },
  },
];

async function main() {
  console.log("🔧 QA Logs Index Migration");
  console.log(DRY_RUN ? "📝 DRY RUN MODE - No changes will be applied\n" : "\n");

  try {
    const db = await getDatabase();
    console.log("✅ Connected to MongoDB");

    // First, check if qa_logs collection exists
    const collections = await db.listCollections({ name: COLLECTIONS.QA_LOGS }).toArray();
    if (collections.length === 0) {
      console.log("⚠️  qa_logs collection does not exist yet, will be created on first insert");
    } else {
      // Count documents for context
      const totalCount = await db.collection(COLLECTIONS.QA_LOGS).countDocuments({});
      const withOrgId = await db.collection(COLLECTIONS.QA_LOGS).countDocuments({ orgId: { $exists: true } });
      console.log(`📊 qa_logs stats: ${totalCount} total documents, ${withOrgId} with orgId`);
      
      if (totalCount > 0 && withOrgId < totalCount) {
        console.log(`⚠️  ${totalCount - withOrgId} legacy documents without orgId will be excluded from org-scoped queries`);
      }
    }

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
    await disconnectFromDatabase();
  }
}

main().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
