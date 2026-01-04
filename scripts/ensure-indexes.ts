#!/usr/bin/env node
/**
 * Script to ensure all database indexes are created
 * Run this after deployment or when database schema changes
 *
 * Usage: tsx scripts/ensure-indexes.ts
 *        tsx scripts/ensure-indexes.ts --verify
 */

import { ensureCoreIndexes } from "../lib/db/index";
import { COLLECTIONS } from "../lib/db/collections";
import { connectToDatabase } from "../lib/mongodb-unified";
import mongoose from "mongoose";

// Collections to verify indexes for
// TD-002: Use CLAIMS_ORDERS instead of legacy ORDERS
const VERIFY_COLLECTIONS = [
  COLLECTIONS.WORK_ORDERS,
  COLLECTIONS.PRODUCTS,
  COLLECTIONS.CLAIMS_ORDERS,
  COLLECTIONS.INVOICES,
  COLLECTIONS.SOUQ_WITHDRAWAL_REQUESTS,
  "supporttickets",
  "helparticles",
  "cmspages",
  "qa_logs",
  "qa_alerts",
] as const;

async function verifyIndexes(db: mongoose.mongo.Db) {
  console.log("\n📋 Verifying indexes on target collections:\n");

  for (const collName of VERIFY_COLLECTIONS) {
    try {
      const coll = db.collection(collName);
      const indexes = await coll.indexes();

      console.log(`\n  📁 ${collName} (${indexes.length} indexes):`);

      // Check for org-scoped unique indexes
      const orgScopedUniques = indexes.filter(
        (idx) =>
          idx.unique &&
          idx.key &&
          typeof idx.key === "object" &&
          "orgId" in idx.key
      );

      // Check for global uniques (BAD - should be org-scoped)
      const globalUniques = indexes.filter(
        (idx) =>
          idx.unique &&
          idx.key &&
          typeof idx.key === "object" &&
          !("orgId" in idx.key) &&
          idx.name !== "_id_"
      );

      if (globalUniques.length > 0) {
        console.log(`     ⚠️  LEGACY global uniques found (should be dropped):`);
        for (const idx of globalUniques) {
          console.log(`        - ${idx.name}: ${JSON.stringify(idx.key)}`);
        }
      }

      if (orgScopedUniques.length > 0) {
        console.log(`     ✅ Org-scoped uniques:`);
        for (const idx of orgScopedUniques) {
          const hasPartial = idx.partialFilterExpression ? " (partial)" : "";
          console.log(`        - ${idx.name}${hasPartial}`);
        }
      }

      // Check TTL indexes for QA collections
      if (collName.startsWith("qa_")) {
        const ttlIndexes = indexes.filter(
          (idx) => typeof idx.expireAfterSeconds === "number"
        );
        if (ttlIndexes.length > 0) {
          console.log(`     ⏰ TTL indexes:`);
          for (const idx of ttlIndexes) {
            const days = Math.round((idx.expireAfterSeconds ?? 0) / (24 * 60 * 60));
            console.log(`        - ${idx.name}: ${days} days`);
          }
        }
      }
    } catch (err) {
      const error = err as { code?: number; message?: string };
      // Collection might not exist yet
      if (error.code === 26) {
        console.log(`  📁 ${collName}: (collection does not exist yet)`);
      } else {
        console.log(`  📁 ${collName}: ❌ Error: ${error.message}`);
      }
    }
  }
}

async function main() {
  const verifyOnly = process.argv.includes("--verify");

  console.log("🚀 Starting index creation process...\n");

  try {
    // Ensure connection
    await connectToDatabase();
    console.log("✅ Connected to database\n");

    if (!verifyOnly) {
      // Create indexes using Mongoose-based ensureCoreIndexes
      // NOTE: ensureCoreIndexes internally calls createIndexes() from lib/db/collections.ts
      // so we don't need to call it again here.
      console.log("📦 Running ensureCoreIndexes (calls createIndexes + Mongoose model indexes)...");
      await ensureCoreIndexes();
      console.log("✅ ensureCoreIndexes completed\n");
    }

    // Verify indexes
    const db = mongoose.connection.db;
    if (db) {
      await verifyIndexes(db);
    }

    console.log("\n✅ Index operations completed successfully!");

    // Exit successfully
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error creating indexes:", error);
    process.exit(1);
  }
}

main();
