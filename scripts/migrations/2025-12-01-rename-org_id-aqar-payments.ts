#!/usr/bin/env npx tsx
/**
 * Migration: Normalize org_id → orgId in aqar_payments
 *
 * Scope:
 * - Rename org_id to orgId (only when orgId is absent to avoid overwrites)
 * - Rebuild any indexes that still reference org_id with orgId equivalents
 *
 * Usage:
 *   DRY RUN (default):
 *     npx tsx scripts/migrations/2025-12-01-rename-org_id-aqar-payments.ts --dry-run
 *
 *   Apply (live):
 *     DRY_RUN=false npx tsx scripts/migrations/2025-12-01-rename-org_id-aqar-payments.ts
 *
 *   Rollback:
 *     ROLLBACK=true npx tsx scripts/migrations/2025-12-01-rename-org_id-aqar-payments.ts
 *
 * Notes:
 * - Requires MONGODB_URI or MONGO_URI to be set.
 * - Safe-guards prevent overwriting orgId when already present; documents with both
 *   fields are reported for manual review.
 */

import { MongoClient, Document, IndexDescription } from "mongodb";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGODB_URI or MONGO_URI environment variable is required");
  process.exit(1);
}

const COLLECTION = "aqar_payments";

function buildCreateIndexOptions(idx: IndexDescription) {
  // Preserve options except internal fields
  const { key, name, ns, v, ...rest } = idx as Record<string, unknown>;
  // Always set background creation for safety
  return { ...rest, background: true };
}

async function renameFields(collection: ReturnType<MongoClient["db"]>["collection"], dryRun: boolean, rollback: boolean) {
  const sourceField = rollback ? "orgId" : "org_id";
  const targetField = rollback ? "org_id" : "orgId";

  // Docs where target is missing (safe to rename)
  const safeFilter = {
    [sourceField]: { $exists: true },
    [targetField]: { $exists: false },
  };

  const conflictFilter = {
    [sourceField]: { $exists: true },
    [targetField]: { $exists: true },
  };

  const conflicts = await collection.countDocuments(conflictFilter);
  if (conflicts > 0) {
    console.warn(
      `⚠️  Found ${conflicts} documents with both ${sourceField} and ${targetField}; skipping these to avoid overwrites.`,
    );
  }

  if (dryRun) {
    const count = await collection.countDocuments(safeFilter);
    console.log(
      `📦 DRY-RUN: ${count} documents would be renamed (${sourceField} → ${targetField})`,
    );
    return;
  }

  const result = await collection.updateMany(safeFilter, { $rename: { [sourceField]: targetField } });
  console.log(
    `📦 Updated ${result.modifiedCount}/${result.matchedCount} documents (${sourceField} → ${targetField})`,
  );
}

function rebuildIndexKey(key: Record<string, number | string>, rollback: boolean) {
  const from = rollback ? "orgId" : "org_id";
  const to = rollback ? "org_id" : "orgId";

  const newKey: Record<string, number | string> = {};
  for (const [k, v] of Object.entries(key)) {
    newKey[k === from ? to : k] = v;
  }
  return newKey;
}

async function rebuildIndexes(collection: ReturnType<MongoClient["db"]>["collection"], dryRun: boolean, rollback: boolean) {
  const indexes = await collection.indexes();
  let updated = 0;

  for (const idx of indexes) {
    if (!idx.key) continue;
    const containsLegacy = Object.keys(idx.key).includes(rollback ? "orgId" : "org_id");
    if (!containsLegacy) continue;

    const newKey = rebuildIndexKey(idx.key as Record<string, number>, rollback);
    console.log(
      `\n📇 ${idx.name}: ${JSON.stringify(idx.key)} → ${JSON.stringify(newKey)}`,
    );

    if (dryRun) {
      updated++;
      continue;
    }

    try {
      await collection.dropIndex(idx.name!);
      console.log(`   ✅ Dropped ${idx.name}`);

      const options = buildCreateIndexOptions(idx);
      await collection.createIndex(newKey, options);
      console.log(`   ✅ Created ${JSON.stringify(newKey)} with options ${JSON.stringify(options)}`);
      updated++;
    } catch (error) {
      console.error(`   ⚠️  Error rebuilding index ${idx.name}: ${(error as Error).message}`);
    }
  }

  if (updated === 0) {
    console.log("📇 No indexes required rebuilding");
  } else {
    console.log(`📊 Indexes updated: ${updated}`);
  }
}

async function runMigration(dryRun: boolean, rollback: boolean) {
  const client = new MongoClient(MONGO_URI!);

  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection(COLLECTION);

    console.log(
      `\n🔄 Migration: ${rollback ? "Rollback" : "Forward"} org_id ↔ orgId in ${COLLECTION}`,
    );
    console.log(`📋 Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE"}\n`);

    await renameFields(collection, dryRun, rollback);
    await rebuildIndexes(collection, dryRun, rollback);

    console.log("\n✅ Migration complete.");
    if (dryRun) {
      console.log("⚠️  This was a dry run. Run with DRY_RUN=false to apply changes.");
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || process.env.DRY_RUN !== "false";
const rollback = args.includes("--rollback") || process.env.ROLLBACK === "true";

runMigration(dryRun, rollback);
