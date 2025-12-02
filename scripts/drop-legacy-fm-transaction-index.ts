#!/usr/bin/env node
/**
 * Migration: Drop legacy global transactionNumber index
 *
 * This script removes the obsolete global `{ transactionNumber: 1 }` unique index
 * from the fm_financial_transactions collection and ensures the correct org-scoped
 * unique `{ orgId: 1, transactionNumber: 1 }` index exists.
 *
 * The legacy global index caused cross-tenant collisions where transaction numbers
 * had to be unique across ALL organizations instead of just within each organization.
 *
 * Usage:
 *   MONGODB_URI=mongodb://... pnpm tsx scripts/drop-legacy-fm-transaction-index.ts
 *
 * Options:
 *   --dry-run     Preview changes without modifying the database
 *
 * After running, verify with:
 *   db.fm_financial_transactions.getIndexes()
 *
 * Expected result:
 *   - NO index with key: { transactionNumber: 1 }
 *   - EXISTS index with key: { orgId: 1, transactionNumber: 1 } and unique: true
 */

import "dotenv/config";
import mongoose from "mongoose";

const COLLECTION_NAME = "fm_financial_transactions";
const LEGACY_INDEX_KEY = { transactionNumber: 1 };
const NEW_INDEX_KEY = { orgId: 1, transactionNumber: 1 };

interface IndexSpec {
  name?: string;
  key: Record<string, 1 | -1>;
  unique?: boolean;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const prefix = dryRun ? "[DRY RUN] " : "";

  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) {
    console.error("❌ MONGODB_URI or DATABASE_URL environment variable is required");
    process.exit(1);
  }

  console.log(`${prefix}🔧 FM Financial Transaction Index Migration`);
  console.log("═".repeat(60));

  try {
    console.log(`${prefix}Connecting to database...`);
    await mongoose.connect(uri);
    console.log(`${prefix}✅ Connected to database\n`);

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    // Check if collection exists
    const collections = await db.listCollections({ name: COLLECTION_NAME }).toArray();
    if (collections.length === 0) {
      console.log(`${prefix}ℹ️  Collection '${COLLECTION_NAME}' does not exist. Nothing to migrate.`);
      await mongoose.disconnect();
      process.exit(0);
    }

    const collection = db.collection(COLLECTION_NAME);

    // List current indexes
    console.log(`${prefix}📋 Current indexes:`);
    const indexes = await collection.listIndexes().toArray();
    
    for (const idx of indexes) {
      const keyStr = JSON.stringify(idx.key);
      const unique = idx.unique ? " (unique)" : "";
      console.log(`  - ${idx.name}: ${keyStr}${unique}`);
    }
    console.log();

    // Find legacy global index (transactionNumber: 1 only, not compound)
    const legacyIndex = indexes.find((idx: IndexSpec) => {
      const keys = Object.keys(idx.key);
      return keys.length === 1 && 
             keys[0] === "transactionNumber" && 
             idx.key.transactionNumber === 1;
    });

    // Find org-scoped index
    const orgScopedIndex = indexes.find((idx: IndexSpec) => {
      const keys = Object.keys(idx.key);
      return keys.length === 2 && 
             idx.key.orgId === 1 && 
             idx.key.transactionNumber === 1;
    });

    // Step 1: Drop legacy global index if exists
    if (legacyIndex) {
      console.log(`${prefix}🗑️  Found legacy global index: ${legacyIndex.name}`);
      if (!dryRun) {
        await collection.dropIndex(legacyIndex.name as string);
        console.log(`${prefix}✅ Dropped legacy index: ${legacyIndex.name}`);
      } else {
        console.log(`${prefix}Would drop index: ${legacyIndex.name}`);
      }
    } else {
      console.log(`${prefix}ℹ️  No legacy global { transactionNumber: 1 } index found`);
    }

    // Step 2: Ensure org-scoped unique index exists
    if (orgScopedIndex && orgScopedIndex.unique) {
      console.log(`${prefix}✅ Org-scoped unique index already exists: ${orgScopedIndex.name}`);
    } else if (orgScopedIndex && !orgScopedIndex.unique) {
      // Index exists but is not unique - need to drop and recreate
      console.log(`${prefix}⚠️  Org-scoped index exists but is NOT unique. Recreating with unique: true`);
      if (!dryRun) {
        await collection.dropIndex(orgScopedIndex.name as string);
        console.log(`${prefix}Dropped non-unique index: ${orgScopedIndex.name}`);
        await collection.createIndex(NEW_INDEX_KEY, { unique: true, background: true });
        console.log(`${prefix}✅ Created org-scoped unique index: { orgId: 1, transactionNumber: 1 }`);
      } else {
        console.log(`${prefix}Would drop index: ${orgScopedIndex.name}`);
        console.log(`${prefix}Would create unique index: { orgId: 1, transactionNumber: 1 }`);
      }
    } else {
      // Index doesn't exist - create it
      console.log(`${prefix}📝 Creating org-scoped unique index...`);
      if (!dryRun) {
        await collection.createIndex(NEW_INDEX_KEY, { unique: true, background: true });
        console.log(`${prefix}✅ Created org-scoped unique index: { orgId: 1, transactionNumber: 1 }`);
      } else {
        console.log(`${prefix}Would create unique index: { orgId: 1, transactionNumber: 1 }`);
      }
    }

    // Verify final state
    console.log(`\n${prefix}📋 Final index state:`);
    const finalIndexes = await collection.listIndexes().toArray();
    for (const idx of finalIndexes) {
      const keyStr = JSON.stringify(idx.key);
      const unique = idx.unique ? " (unique)" : "";
      console.log(`  - ${idx.name}: ${keyStr}${unique}`);
    }

    console.log("\n" + "═".repeat(60));
    if (dryRun) {
      console.log("⚠️  This was a DRY RUN. No changes were made.");
      console.log("   Remove --dry-run to apply changes.");
    } else {
      console.log("✅ Migration completed successfully!");
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
