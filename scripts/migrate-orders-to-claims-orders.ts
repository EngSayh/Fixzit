#!/usr/bin/env tsx
/**
 * Migration Script: Rename 'orders' collection to 'claims_orders'
 * 
 * This script:
 * 1. Copies all documents from 'orders' to 'claims_orders'
 * 2. Creates appropriate indexes on 'claims_orders'
 * 3. Optionally drops the old 'orders' collection after verification
 * 
 * Usage:
 *   pnpm tsx scripts/migrate-orders-to-claims-orders.ts [--dry-run] [--drop-old]
 * 
 * Flags:
 *   --dry-run   Preview changes without executing (default)
 *   --execute   Actually perform the migration
 *   --drop-old  Drop the old 'orders' collection after migration (requires --execute)
 * 
 * @author [AGENT-0013]
 * @created 2026-01-05
 */

import { MongoClient, type Db } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const OLD_COLLECTION = "orders";
const NEW_COLLECTION = "claims_orders";

async function migrate() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes("--execute");
  const shouldDropOld = args.includes("--drop-old");

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  Migration: orders → claims_orders                         ║");
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log(`║  Mode: ${isDryRun ? "DRY RUN (preview only)" : "EXECUTE (making changes)"}`.padEnd(63) + "║");
  console.log(`║  Drop old: ${shouldDropOld ? "YES" : "NO"}`.padEnd(63) + "║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI not set in environment");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();
    
    // Check if old collection exists
    const collections = await db.listCollections({ name: OLD_COLLECTION }).toArray();
    if (collections.length === 0) {
      console.log(`⚠️  Collection '${OLD_COLLECTION}' does not exist. Nothing to migrate.`);
      
      // Check if new collection already exists
      const newCollections = await db.listCollections({ name: NEW_COLLECTION }).toArray();
      if (newCollections.length > 0) {
        const count = await db.collection(NEW_COLLECTION).countDocuments();
        console.log(`✅ Collection '${NEW_COLLECTION}' already exists with ${count} documents.`);
      }
      return;
    }

    // Count documents in old collection
    const oldCount = await db.collection(OLD_COLLECTION).countDocuments();
    console.log(`📊 Found ${oldCount} documents in '${OLD_COLLECTION}'`);

    if (isDryRun) {
      console.log();
      console.log("🔍 DRY RUN - The following actions would be performed:");
      console.log(`   1. Create collection '${NEW_COLLECTION}'`);
      console.log(`   2. Copy ${oldCount} documents from '${OLD_COLLECTION}' to '${NEW_COLLECTION}'`);
      console.log("   3. Create indexes on '${NEW_COLLECTION}':");
      console.log("      - { orgId: 1, _id: 1 }");
      console.log("      - { orgId: 1, orderId: 1 }");
      console.log("      - { orgId: 1, buyerId: 1 }");
      if (shouldDropOld) {
        console.log(`   4. Drop old collection '${OLD_COLLECTION}'`);
      }
      console.log();
      console.log("👉 Run with --execute to perform these actions");
      return;
    }

    // Execute migration
    console.log();
    console.log("🚀 Starting migration...");

    // Check if new collection already exists
    const newCollections = await db.listCollections({ name: NEW_COLLECTION }).toArray();
    if (newCollections.length > 0) {
      const existingCount = await db.collection(NEW_COLLECTION).countDocuments();
      console.log(`⚠️  Collection '${NEW_COLLECTION}' already exists with ${existingCount} documents.`);
      
      if (existingCount >= oldCount) {
        console.log("   Skipping copy - target collection has equal or more documents.");
      } else {
        console.log("   Target has fewer documents - appending missing documents...");
        // Only copy documents that don't exist in target
        const cursor = db.collection(OLD_COLLECTION).find();
        let copied = 0;
        for await (const doc of cursor) {
          const exists = await db.collection(NEW_COLLECTION).findOne({ _id: doc._id });
          if (!exists) {
            await db.collection(NEW_COLLECTION).insertOne(doc);
            copied++;
          }
        }
        console.log(`   Copied ${copied} new documents.`);
      }
    } else {
      // Copy all documents using aggregation pipeline
      console.log(`📋 Copying ${oldCount} documents to '${NEW_COLLECTION}'...`);
      
      if (oldCount > 0) {
        await db.collection(OLD_COLLECTION).aggregate([
          { $match: {} },
          { $out: NEW_COLLECTION }
        ]).toArray();
        
        const newCount = await db.collection(NEW_COLLECTION).countDocuments();
        console.log(`✅ Copied ${newCount} documents to '${NEW_COLLECTION}'`);
      } else {
        // Create empty collection
        await db.createCollection(NEW_COLLECTION);
        console.log(`✅ Created empty collection '${NEW_COLLECTION}'`);
      }
    }

    // Create indexes
    console.log("📇 Creating indexes...");
    await db.collection(NEW_COLLECTION).createIndexes([
      { key: { orgId: 1, _id: 1 }, name: "orgId_id", background: true },
      { key: { orgId: 1, orderId: 1 }, name: "orgId_orderId", background: true },
      { key: { orgId: 1, buyerId: 1 }, name: "orgId_buyerId", background: true },
    ]);
    console.log("✅ Indexes created");

    // Optionally drop old collection
    if (shouldDropOld) {
      console.log(`🗑️  Dropping old collection '${OLD_COLLECTION}'...`);
      await db.collection(OLD_COLLECTION).drop();
      console.log(`✅ Dropped '${OLD_COLLECTION}'`);
    } else {
      console.log(`📌 Kept old collection '${OLD_COLLECTION}' (run with --drop-old to remove)`);
    }

    console.log();
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║  ✅ Migration Complete                                     ║");
    console.log("╚════════════════════════════════════════════════════════════╝");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("🔌 Disconnected from MongoDB");
  }
}

migrate();
