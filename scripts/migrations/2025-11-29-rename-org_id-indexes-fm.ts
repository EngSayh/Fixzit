#!/usr/bin/env npx tsx
/**
 * Migration: Update org_id indexes to orgId across all FM collections
 * 
 * AUDIT-2025-11-29: Standardize index naming to camelCase for consistency
 * 
 * This migration updates the remaining org_id indexes found in FM collections.
 * The documents already use orgId, but the indexes were created with org_id.
 * 
 * Run with: npx tsx scripts/migrations/2025-11-29-rename-org_id-indexes-fm.ts
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

async function runMigration(dryRun: boolean) {
  const client = new MongoClient(MONGO_URI!);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log(`\n🔄 Migration: Update org_id indexes to orgId in FM collections`);
    console.log(`📋 Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE"}\n`);

    // Get all collections
    const collections = await db.listCollections().toArray();
    
    let totalUpdated = 0;
    let totalSkipped = 0;
    
    for (const col of collections) {
      const collection = db.collection(col.name);
      const indexes = await collection.indexes();
      
      // Find indexes that contain org_id
      const orgIdIndexes = indexes.filter((idx) => {
        if (!idx.key) return false;
        return Object.keys(idx.key).some((k) => k === "org_id");
      });
      
      if (orgIdIndexes.length === 0) {
        continue;
      }
      
      console.log(`\n📦 ${col.name}: Found ${orgIdIndexes.length} indexes with org_id`);
      
      for (const idx of orgIdIndexes) {
        const oldKeys = idx.key as Record<string, number>;
        const newKeys: Record<string, number> = {};
        
        // Replace org_id with orgId in the key
        for (const [k, v] of Object.entries(oldKeys)) {
          newKeys[k === "org_id" ? "orgId" : k] = v;
        }
        
        console.log(`   📇 ${idx.name}: ${JSON.stringify(oldKeys)} → ${JSON.stringify(newKeys)}`);
        
        if (!dryRun) {
          try {
            // Drop the old index
            await collection.dropIndex(idx.name!);
            console.log(`   ✅ Dropped: ${idx.name}`);
            
            // Create the new index with same options (except internal fields)
            const { key, name, ns, v, ...options } = idx;
            await collection.createIndex(newKeys, { ...options, background: true });
            console.log(`   ✅ Created: ${JSON.stringify(newKeys)}`);
            totalUpdated++;
          } catch (error) {
            console.log(`   ⚠️  Error: ${(error as Error).message}`);
          }
        } else {
          totalUpdated++;
        }
      }
    }
    
    console.log(`\n✅ Migration complete!`);
    console.log(`   📊 Indexes updated: ${totalUpdated}`);
    
    if (dryRun) {
      console.log("\n⚠️  This was a dry run. Run without --dry-run to apply changes.");
      console.log("   Run: DRY_RUN=false npx tsx scripts/migrations/2025-11-29-rename-org_id-indexes-fm.ts");
    }
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Parse arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || process.env.DRY_RUN !== "false";

runMigration(dryRun);
