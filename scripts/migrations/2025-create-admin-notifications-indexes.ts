#!/usr/bin/env npx tsx
/**
 * Migration: Create Admin Notifications Indexes
 *
 * Adds indexes for admin_notifications collection:
 * - { orgId: 1, sentAt: -1 } for org-scoped history queries
 * - TTL on sentAt to bound retention (90 days)
 *
 * Run with: npx tsx scripts/migrations/2025-create-admin-notifications-indexes.ts
 * Options:
 *   --dry-run    Preview changes without applying them
 */

import { MongoClient, ObjectId } from "mongodb";
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
    collection: "admin_notifications",
    index: { orgId: 1, sentAt: -1 },
    options: {
      name: "orgId_sentAt_desc",
      background: true,
    },
  },
  {
    collection: "admin_notifications",
    index: { sentAt: 1 },
    options: {
      name: "ttl_admin_notifications_90d",
      background: true,
      expireAfterSeconds: 90 * 24 * 60 * 60,
      // Only apply TTL to docs with orgId to avoid touching legacy rows
      partialFilterExpression: { orgId: { $exists: true } },
    },
  },
];

async function main() {
  console.log("🔧 Admin Notifications Index Migration");
  console.log(DRY_RUN ? "📝 DRY RUN MODE - No changes will be applied\n" : "\n");

  const client = new MongoClient(MONGO_URI!);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();

    for (const { collection, index, options } of INDEXES_TO_CREATE) {
      console.log(`\n📊 Creating index on ${collection}:`, index);

      try {
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
