#!/usr/bin/env npx tsx
/**
 * Migration: Ensure audit_logs TTL and supporting indexes exist.
 *
 * - Recreate TTL index on { timestamp: 1 } with 2-year retention (if missing)
 * - Ensure orgId+timestamp compound index exists for org-scoped queries
 *
 * Run: npx tsx scripts/migrations/2025-ensure-audit-log-ttl.ts [--dry-run]
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
    collection: "auditlogs",
    index: { timestamp: 1 },
    options: {
      name: "ttl_auditlogs_2y",
      background: true,
      expireAfterSeconds: 2 * 365 * 24 * 60 * 60,
    },
  },
  {
    collection: "auditlogs",
    index: { orgId: 1, timestamp: -1 },
    options: {
      name: "orgId_timestamp_desc",
      background: true,
    },
  },
];

async function main() {
  console.log("🔧 Audit Logs TTL/Index Migration");
  console.log(DRY_RUN ? "📝 DRY RUN MODE - No changes will be applied\n" : "\n");

  const client = new MongoClient(MONGO_URI!);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();

    for (const { collection, index, options } of INDEXES_TO_CREATE) {
      console.log(`\n📊 Ensuring index on ${collection}:`, index);

      try {
        const existingIndexes = await db.collection(collection).listIndexes().toArray();
        const exists = existingIndexes.some((existing) => existing.name === options.name);
        if (exists) {
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
        console.error(
          `   ❌ Failed to create index:`,
          error instanceof Error ? error.message : error,
        );
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
