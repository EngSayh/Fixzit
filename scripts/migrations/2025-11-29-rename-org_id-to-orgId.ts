#!/usr/bin/env npx tsx
/**
 * Migration: Rename org_id → orgId across all collections
 * 
 * AUDIT-2025-11-29: Standardize field naming to camelCase for consistency
 * 
 * This migration renames snake_case tenant fields to camelCase in the following collections:
 * - onboarding_cases (org_id → orgId, subject_org_id → subjectOrgId)
 * - souq_settlements (org_id → orgId)
 * - souq_reviews (org_id → orgId)
 * - payment_methods (org_id → orgId)
 * - agent_audit_logs (org_id → orgId)
 * 
 * Run with: npx tsx scripts/migrations/2025-11-29-rename-org_id-to-orgId.ts
 * 
 * Options:
 *   --dry-run    Preview changes without applying them
 *   --rollback   Reverse the migration (orgId → org_id)
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

const COLLECTIONS_TO_MIGRATE = [
  { name: "onboarding_cases", field: "org_id", newField: "orgId" },
  { name: "onboarding_cases", field: "subject_org_id", newField: "subjectOrgId" },
  { name: "souq_settlements", field: "org_id", newField: "orgId" },
  { name: "souq_reviews", field: "org_id", newField: "orgId" },
  { name: "payment_methods", field: "org_id", newField: "orgId" },
  { name: "agent_audit_logs", field: "org_id", newField: "orgId" },
];

// Index definitions to update (drop old, create new)
const INDEXES_TO_UPDATE = [
  {
    collection: "onboarding_cases",
    dropIndex: { org_id: 1 },
    createIndex: { orgId: 1 },
    indexOptions: { background: true },
  },
  {
    collection: "onboarding_cases",
    dropIndex: { org_id: 1, status: 1, role: 1 },
    createIndex: { orgId: 1, status: 1, role: 1 },
    indexOptions: { background: true },
  },
  {
    collection: "onboarding_cases",
    dropIndex: { subject_org_id: 1 },
    createIndex: { subjectOrgId: 1 },
    indexOptions: { background: true },
  },
  {
    collection: "souq_settlements",
    dropIndex: { org_id: 1, status: 1 },
    createIndex: { orgId: 1, status: 1 },
    indexOptions: { background: true },
  },
  {
    collection: "payment_methods",
    dropIndex: { org_id: 1 },
    createIndex: { orgId: 1 },
    indexOptions: { background: true },
  },
  {
    collection: "agent_audit_logs",
    dropIndex: { org_id: 1, timestamp: -1 },
    createIndex: { orgId: 1, timestamp: -1 },
    indexOptions: { background: true },
  },
  {
    collection: "agent_audit_logs",
    dropIndex: { org_id: 1, resource_type: 1, timestamp: -1 },
    createIndex: { orgId: 1, resource_type: 1, timestamp: -1 },
    indexOptions: { background: true },
  },
  {
    collection: "agent_audit_logs",
    dropIndex: { org_id: 1, success: 1, timestamp: -1 },
    createIndex: { orgId: 1, success: 1, timestamp: -1 },
    indexOptions: { background: true },
  },
];

function buildCreateIndexOptions(
  existingIndex: Record<string, any> | undefined,
  indexOptions: Record<string, any> = {},
) {
  if (!existingIndex) return { ...indexOptions };
  const { key, name, ns, v, ...rest } = existingIndex;
  return { ...rest, ...indexOptions };
}

async function runMigration(dryRun: boolean, rollback: boolean) {
  const client = new MongoClient(MONGO_URI!);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log(`\n🔄 Migration: ${rollback ? "Rollback" : "Forward"} (org_id ${rollback ? "←" : "→"} orgId)`);
    console.log(`📋 Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE"}\n`);

    // Step 1: Rename fields in documents
    for (const { name, field, newField } of COLLECTIONS_TO_MIGRATE) {
      const collection = db.collection(name);
      const sourceField = rollback ? newField : field;
      const targetField = rollback ? field : newField;
      const filter = { [sourceField]: { $exists: true } };
      
      if (dryRun) {
        const count = await collection.countDocuments(filter);
        if (count === 0) {
          console.log(`⏭️  ${name}: No documents with '${sourceField}' field, skipping`);
          continue;
        }
        console.log(`📦 ${name}: ${count} documents would update (${sourceField} → ${targetField})`);
        continue;
      }

      // Use $rename to atomically rename the field
      const result = await collection.updateMany(filter, { $rename: { [sourceField]: targetField } });
      if (result.matchedCount === 0) {
        console.log(`⏭️  ${name}: No documents with '${sourceField}' field, skipping`);
      } else {
        console.log(
          `📦 ${name}: ${result.modifiedCount} documents updated (${sourceField} → ${targetField})`,
        );
      }
    }

    // Step 2: Update indexes
    console.log("\n📇 Updating indexes...");
    
    for (const { collection: collName, dropIndex, createIndex, indexOptions } of INDEXES_TO_UPDATE) {
      const collection = db.collection(collName);
      const sourceIndex = rollback ? createIndex : dropIndex;
      const targetIndex = rollback ? dropIndex : createIndex;
      
      try {
        // Check if source index exists
        const indexes = await collection.indexes();
        const existingIndex = indexes.find((idx) => {
          const idxKeys = Object.keys(idx.key ?? {});
          const sourceKeys = Object.keys(sourceIndex);
          if (idxKeys.length !== sourceKeys.length) return false;
          // Compare key/value regardless of key order
          return sourceKeys.every(
            (k) => (idx.key as Record<string, number | undefined>)?.[k] === sourceIndex[k as keyof typeof sourceIndex],
          );
        });
        
        if (existingIndex) {
          console.log(`   ${collName}: Found index ${JSON.stringify(sourceIndex)}`);
          
          if (!dryRun) {
            // Drop old index
            await collection.dropIndex(existingIndex.name!);
            console.log(`   ✅ Dropped: ${existingIndex.name}`);
            
            // Create new index
            const createOptions = buildCreateIndexOptions(existingIndex, indexOptions);
            await collection.createIndex(targetIndex, createOptions);
            console.log(`   ✅ Created: ${JSON.stringify(targetIndex)} with options ${JSON.stringify(createOptions)}`);
          }
        } else {
          console.log(`   ⚠️  ${collName}: Index ${JSON.stringify(sourceIndex)} not found`);
          if (!dryRun) {
            const createOptions = { ...indexOptions };
            await collection.createIndex(targetIndex, createOptions);
            console.log(`   ✅ Created missing index ${JSON.stringify(targetIndex)} with options ${JSON.stringify(createOptions)}`);
          }
        }
      } catch (error) {
        console.log(`   ⚠️  ${collName}: Error updating index: ${(error as Error).message}`);
      }
    }

    console.log("\n✅ Migration complete!");
    
    if (dryRun) {
      console.log("\n⚠️  This was a dry run. Run without --dry-run to apply changes.");
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
const dryRun = args.includes("--dry-run");
const rollback = args.includes("--rollback");

runMigration(dryRun, rollback);
