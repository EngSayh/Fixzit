#!/usr/bin/env npx tsx
/**
 * Migration: Normalize legacy org_id -> orgId for Souq collections
 *
 * Goals:
 * - Copy legacy `org_id` into `orgId` when `orgId` is missing
 * - Keep legacy field by default (safe, non-destructive) unless --unset-legacy is passed
 * - Operates in batches on Atlas 4.2+ using update pipeline ($toString on ObjectId)
 *
 * Usage:
 *   # Dry-run (default)
 *   npx tsx scripts/migrations/2025-12-20-normalize-souq-orgId.ts
 *
 *   # Apply changes (keeps org_id)
 *   npx tsx scripts/migrations/2025-12-20-normalize-souq-orgId.ts --apply
 *
 *   # Apply changes and remove org_id after copy
 *   npx tsx scripts/migrations/2025-12-20-normalize-souq-orgId.ts --apply --unset-legacy
 *
 * Env:
 *   MONGODB_URI or MONGO_URI must be set. Loads .env.local and .env automatically.
 */

import { MongoClient } from "mongodb";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGODB_URI or MONGO_URI is required");
  process.exit(1);
}

type TargetCollection = {
  name: string;
  description: string;
};

const TARGETS: TargetCollection[] = [
  { name: "souq_orders", description: "Marketplace orders" },
  { name: "souq_reviews", description: "Product reviews" },
  { name: "claims", description: "Souq claims" },
  { name: "souq_refunds", description: "Refund records" },
  { name: "souq_listings", description: "Listings / inventory linkage" },
  { name: "souq_products", description: "Products catalog" },
  { name: "souq_inventories", description: "Inventory records" },
];

type Flags = {
  apply: boolean;
  unsetLegacy: boolean;
  collections?: Set<string>;
};

function parseArgs(): Flags {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const unsetLegacy = args.includes("--unset-legacy");
  const collectionsArg = args.find((a) => a.startsWith("--collections="));
  const collections = collectionsArg
    ? new Set(collectionsArg.replace("--collections=", "").split(",").map((s) => s.trim()).filter(Boolean))
    : undefined;
  return { apply, unsetLegacy, collections };
}

async function normalizeCollection(
  client: MongoClient,
  target: TargetCollection,
  flags: Flags,
): Promise<void> {
  const db = client.db();
  const coll = db.collection(target.name);
  const filter = { org_id: { $exists: true }, orgId: { $exists: false } };

  const count = await coll.countDocuments(filter);
  if (count === 0) {
    console.log(`⏭️  ${target.name}: already normalized (no org_id without orgId)`);
    return;
  }

  // Sample a few IDs for visibility
  const sample = await coll
    .find(filter, { projection: { _id: 1, org_id: 1 }, limit: 5 })
    .toArray()
    .catch(() => []);

  console.log(`📦 ${target.name}: ${count} docs need orgId backfill (${target.description})`);
  if (sample.length > 0) {
    console.log(
      `   Samples: ${sample
        .map((s) => `${s._id} -> ${s.org_id}`)
        .join(", ")}`,
    );
  }

  if (!flags.apply) {
    console.log("   DRY RUN: no writes performed\n");
    return;
  }

  // Use aggregation pipeline update (MongoDB 4.2+) to copy and normalize type
  const updatePipeline: Record<string, unknown>[] = [
    {
      $set: {
        orgId: {
          $cond: [
            { $eq: [{ $type: "$org_id" }, "objectId"] },
            { $toString: "$org_id" },
            "$org_id",
          ],
        },
      },
    },
  ];

  if (flags.unsetLegacy) {
    updatePipeline.push({ $unset: "org_id" });
  }

  const result = await coll.updateMany(filter, updatePipeline as any);
  console.log(
    `   ✅ Updated ${result.modifiedCount}/${result.matchedCount} docs (${flags.unsetLegacy ? "moved" : "copied"} org_id -> orgId)\n`,
  );
}

async function main() {
  const flags = parseArgs();

  console.log("\n🔄 Migration: Normalize legacy org_id -> orgId (Souq)");
  console.log(`📋 Mode: ${flags.apply ? "APPLY" : "DRY RUN"} | Unset legacy: ${flags.unsetLegacy ? "YES" : "NO"}`);
  console.log(
    `🗂️  Collections: ${
      flags.collections ? Array.from(flags.collections).join(",") : "default Souq set"
    }\n`,
  );

  const targets = flags.collections
    ? TARGETS.filter((t) => flags.collections!.has(t.name))
    : TARGETS;

  const client = new MongoClient(MONGO_URI!);

  try {
    await client.connect();
    for (const target of targets) {
      await normalizeCollection(client, target, flags);
    }
    console.log("🎉 Done.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await client.close().catch(() => undefined);
  }
}

void main();
